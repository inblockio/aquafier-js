#!/usr/bin/env python3
"""
Database Schema Visualizer
Dynamically parses Prisma schema and generates an ER diagram with:
- All models and fields automatically extracted from schema.prisma
- DB-enforced relationships via @relation annotations
- Code-based relationships inferred from the codebase
- Logical grouping by domain
- Human-readable output
"""

import re
import os
import graphviz
from pathlib import Path
from typing import Dict, List, Tuple, Set

class PrismaParser:
    """Parses Prisma schema files to extract models and relationships."""

    def __init__(self, schema_path: str):
        self.schema_path = Path(schema_path)
        self.content = self.schema_path.read_text()
        self.models: Dict[str, Dict] = {}
        self.relations: List[Tuple[str, str, str, bool]] = []  # (src, dst, label, is_db_enforced)
        self.parse()

    def parse(self):
        """Parse the Prisma schema file."""
        # Split by model definitions
        model_pattern = r'model\s+(\w+)\s*\{([^}]+)\}'

        for match in re.finditer(model_pattern, self.content):
            model_name = match.group(1)
            model_body = match.group(2)

            fields = self._parse_fields(model_body)
            relations = self._parse_relations(model_body, model_name)

            self.models[model_name] = {
                'fields': fields,
                'relations': relations
            }

    def _parse_fields(self, model_body: str) -> List[Tuple[str, str]]:
        """Parse fields from a model body. Returns list of (name, type_display)."""
        fields = []
        # Match field definitions: name type? attributes
        field_pattern = r'^\s*(\w+)\s+([\w\[\]?]+)(.*)$'

        for line in model_body.split('\n'):
            line = line.strip()
            if not line or line.startswith('@@') or line.startswith('/'):
                continue

            match = re.match(field_pattern, line)
            if match:
                name = match.group(1)
                field_type = match.group(2)
                attributes = match.group(3)

                # Skip relation fields (they're shown as edges, not fields)
                if '@relation' in attributes:
                    continue

                # Make it readable
                type_display = field_type
                if '@id' in attributes:
                    type_display += ' 🔑'
                elif '@unique' in attributes:
                    type_display += ' ✦'

                fields.append((name, type_display))

        return fields

    def _parse_relations(self, model_body: str, model_name: str) -> List[Dict]:
        """Parse @relation annotations from a model."""
        relations = []
        relation_pattern = r'@relation\(([^)]+)\)'

        for match in re.finditer(relation_pattern, model_body):
            rel_content = match.group(1)
            relations.append({
                'content': rel_content,
                'model': model_name
            })

        return relations

    def extract_db_relations(self) -> List[Tuple[str, str, str, bool]]:
        """Extract DB-enforced relationships from @relation annotations."""
        relations = []

        for model_name, model_info in self.models.items():
            # Need to re-parse model body to get field type info
            model_match = re.search(rf'model\s+{model_name}\s*\{{([^}}]+)\}}', self.content)
            if not model_match:
                continue

            model_body = model_match.group(1)

            # Parse each line to find @relation fields
            for line in model_body.split('\n'):
                line = line.strip()
                if not line or not '@relation' in line:
                    continue

                # Parse: FieldName TargetModelType @relation(...)
                match = re.match(r'(\w+)\s+([\w\[\]?]+)\s+.*@relation\(([^)]+)\)', line)
                if not match:
                    continue

                field_name = match.group(1)
                field_type = match.group(2).rstrip('[]?')  # Remove [], ?
                rel_content = match.group(3)

                # field_type should be the target model name
                if field_type in self.models:
                    target_model = field_type

                    # Extract the local field reference
                    fields_match = re.search(r'fields:\s*\[([^\]]+)\]', rel_content)
                    if fields_match:
                        local_field = fields_match.group(1).strip()
                        label = f'{local_field} → {target_model}'
                        relations.append((model_name, target_model, label, True))

        return relations


class CodebaseAnalyzer:
    """Analyzes codebase to infer code-based relationships."""

    def __init__(self, root_path: str):
        self.root_path = Path(root_path)
        self.model_references: Dict[str, Set[str]] = {}  # model -> set of referenced models

    def analyze(self, model_names: Set[str]) -> List[Tuple[str, str, str]]:
        """
        Scan codebase for references between models.
        Returns list of (source_model, target_model, type_of_reference)
        """
        relations = []

        # Scan TypeScript/JavaScript files
        for ts_file in self.root_path.rglob('*.ts'):
            if 'node_modules' in str(ts_file) or '.next' in str(ts_file):
                continue
            try:
                content = ts_file.read_text(encoding='utf-8', errors='ignore')
                self._scan_file(content, model_names, ts_file, relations)
            except Exception:
                pass

        return relations

    def _scan_file(self, content: str, model_names: Set[str], file_path: Path,
                   relations: List[Tuple[str, str, str]]):
        """Scan a single file for model references."""
        file_name = file_path.name

        for model_name in model_names:
            # Look for references like: await db.modelName.findUnique()
            patterns = [
                rf'db\.{model_name}\.(?:find|create|update|delete)',
                rf'\b{model_name}\b.*\$\.(?:select|include)',
                rf'Prisma\.{model_name}',
                rf'type.*{model_name}',
            ]

            for pattern in patterns:
                if re.search(pattern, content):
                    # Try to find what model is using this
                    for other_model in model_names:
                        if other_model == model_name:
                            continue
                        # Check if this file deals with both models
                        if other_model in content:
                            relations.append((other_model, model_name, 'code_ref'))
                            break


class SchemaVisualizer:
    """Creates visual ERD diagrams from parsed schema."""

    # Domain groupings (model -> group)
    DOMAIN_GROUPS = {
        # User & Auth
        'Users': 'User & Auth',
        'UserAttestationAddresses': 'User & Auth',
        'Settings': 'User & Auth',
        'SiweSession': 'User & Auth',
        'Notifications': 'User & Auth',

        # Templates & Forms
        'AquaTemplate': 'Templates & Forms',
        'AquaTemplateFields': 'Templates & Forms',
        'AquaForms': 'Templates & Forms',

        # Contracts & Revisions
        'Contract': 'Contracts & Revisions',
        'Latest': 'Contracts & Revisions',
        'Revision': 'Contracts & Revisions',

        # Files
        'File': 'Files',
        'FileIndex': 'Files',
        'FileName': 'Files',

        # Verification
        'VerificationData': 'Verification',
        'VerificationAttempt': 'Verification',
        'DNSClaimVerification': 'Verification',

        # Crypto & Merkle
        'Link': 'Crypto & Merkle',
        'Signature': 'Crypto & Merkle',
        'Witness': 'Crypto & Merkle',
        'WitnessEvent': 'Crypto & Merkle',
        'MerkleNodes': 'Crypto & Merkle',
    }

    DOMAIN_COLORS = {
        'User & Auth': '#E8F4F8',
        'Templates & Forms': '#E8F8E8',
        'Contracts & Revisions': '#F8F8E8',
        'Files': '#F0E8F8',
        'Verification': '#F8E8E8',
        'Crypto & Merkle': '#E8E8E8',
    }

    def __init__(self, parser: PrismaParser, analyzer: 'CodebaseAnalyzer' = None):
        self.parser = parser
        self.analyzer = analyzer
        self.inferred_relations: Set[Tuple] = set()
        if analyzer:
            self._load_inferred_relations()

    def create_diagram(self, output_file: str = 'schema_diagram') -> graphviz.Digraph:
        """Create and return the ERD diagram."""
        dot = graphviz.Digraph('ERD', filename=output_file, format='png')

        # Graph settings optimized for Mihai's 15" MacBook (1728 x 1117 logical pixels)
        # PRIORITY: Large readable fonts (80pt) - size is secondary
        # Will naturally fit on 2-4 screens depending on schema complexity
        dot.attr(rankdir='TB', dpi='72', nodesep='0.15', ranksep='0.3')
        dot.attr('node', fontsize='80', fontname='Helvetica', shape='box', style='rounded,filled', margin='0.35,0.2')
        dot.attr('edge', fontsize='64', fontname='Helvetica')
        dot.attr(newrank='true', compound='true')
        # Use splines for smoother, more visible bezier-style connections
        dot.attr(splines='curved')

        # Group models by domain
        groups: Dict[str, List[str]] = {}
        for model_name in self.parser.models.keys():
            group = self.DOMAIN_GROUPS.get(model_name, 'Other')
            if group not in groups:
                groups[group] = []
            groups[group].append(model_name)

        # Organize groups into logical rows to minimize crossing edges
        # Row 1: User & Auth (top)
        # Row 2: Templates & Forms, Contracts & Revisions, Files (middle)
        # Row 3: Verification, Crypto & Merkle (bottom)
        group_ranks = {
            'User & Auth': '0',
            'Templates & Forms': '1',
            'Contracts & Revisions': '1',
            'Files': '1',
            'Verification': '2',
            'Crypto & Merkle': '2',
        }

        # Create subgraphs for each domain
        for group_idx, (group_name, models) in enumerate(sorted(groups.items())):
            color = self.DOMAIN_COLORS.get(group_name, '#F8F8F8')
            rank = group_ranks.get(group_name, '0')
            with dot.subgraph(name=f'cluster_{group_idx}') as cluster:
                cluster.attr(label=group_name, fontsize='40', style='rounded,filled',
                           color='#CCCCCC', fillcolor=color, penwidth='2', rank=rank)

                for model_name in sorted(models):
                    self._add_model_node(cluster, model_name)

        # Add DB-enforced relationships with thick, visible lines
        db_relations = self.parser.extract_db_relations()
        for src, dst, label, is_db in db_relations:
            # WWW SQL Designer style: thick, clear relationship lines with arrows
            dot.edge(src, dst,
                    label=label,
                    style='solid',
                    color='#2563EB',  # Strong blue for DB relations
                    penwidth='8',      # Much thicker for visibility
                    arrowhead='normal',
                    arrowsize='2.0',
                    fontcolor='#1E40AF')

        # Add inferred code-based relationships
        self._add_inferred_relations(dot)

        # Add legend
        self._add_legend(dot)

        return dot

    def _add_model_node(self, graph, model_name: str):
        """Add a model node to the graph."""
        model = self.parser.models[model_name]
        fields = model['fields']

        # Use HTML-like labels for rich formatting with distinct table headers
        # Show up to 8 fields - keeps boxes readable with large fonts
        field_rows = []
        for name, ftype in fields[:8]:
            # Escape HTML special chars
            name_escaped = name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            ftype_escaped = ftype.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            field_rows.append(f'<TR><TD ALIGN="LEFT">{name_escaped}: {ftype_escaped}</TD></TR>')

        if len(fields) > 8:
            field_rows.append(f'<TR><TD ALIGN="LEFT"><I>... +{len(fields) - 8} more</I></TD></TR>')

        # Create HTML table with prominent header
        label = f'''<
<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="8">
  <TR><TD BGCOLOR="#333333"><FONT COLOR="white" POINT-SIZE="90"><B>{model_name}</B></FONT></TD></TR>
  {''.join(field_rows)}
</TABLE>
>'''

        graph.node(model_name, label=label, shape='plain')

    def _load_inferred_relations(self):
        """Load code-inferred relationships from codebase analyzer."""
        if not self.analyzer:
            return

        code_relations = self.analyzer.analyze(set(self.parser.models.keys()))

        # Deduplicate and add to inferred relations
        for src, dst, rel_type in code_relations:
            if src != dst:  # Skip self-references from code scanner
                self.inferred_relations.add((src, dst, rel_type))

    def _add_inferred_relations(self, dot: graphviz.Digraph):
        """Add code-inferred relationships to the diagram."""
        # These are hardcoded relationships we know exist from schema analysis
        hardcoded_inferred = [
            # User relationships (code-based)
            ('SiweSession', 'Users', 'address [code]'),
            ('Notifications', 'Users', 'sender → address [code]'),
            ('Contract', 'Users', 'sender [code]'),
            ('AquaTemplate', 'Users', 'owner [code]'),

            # Template relationships
            ('Latest', 'AquaTemplate', 'template_id [code]'),

            # Contract-Revision relationships
            ('Contract', 'Revision', 'sender+latest → pubkey_hash [code]'),

            # Revision-File relationships
            ('Revision', 'File', 'file_hash [code]'),
            ('Revision', 'Revision', 'previous → pubkey_hash [code]'),
            ('Latest', 'Revision', 'hash [code]'),

            # File relationships
            ('FileIndex', 'File', 'file_hash [code]'),
            ('FileName', 'Revision', 'pubkey_hash [code]'),

            # MerkleNodes self-relationship
            ('MerkleNodes', 'MerkleNodes', 'parent_hash → node_hash [code]'),
        ]

        # Combine hardcoded with discovered inferred relations
        all_inferred = set(hardcoded_inferred) | self.inferred_relations

        for src, dst, label in all_inferred:
            # Only add if both models exist
            if src in self.parser.models and dst in self.parser.models:
                # Code-inferred relations: dashed, thicker, with distinct color
                dot.edge(src, dst,
                        label=label,
                        style='dashed',
                        color='#DC2626',  # Red for code-based relations
                        penwidth='6',      # Thick but slightly thinner than DB relations
                        arrowhead='open',
                        arrowsize='1.5',
                        fontcolor='#991B1B')

    def _add_legend(self, dot: graphviz.Digraph):
        """Add a legend explaining the diagram."""
        legend = """
        <b>Database Schema Diagram</b><br/>
        <b>─────────────────────</b><br/>
        <b><font color="#2563EB">━━━ Blue solid:</font></b> DB-enforced @relation<br/>
        <b><font color="#DC2626">- - - Red dashed:</font></b> Code-inferred relationships<br/>
        <b>🔑 Key icon:</b> Primary key<br/>
        <b>✦ Star icon:</b> Unique constraint
        """

        dot.attr(label=legend, labelloc='b', fontsize='28')


def main():
    """Main entry point."""
    # Find schema.prisma
    schema_paths = [
        Path('/Users/mihai/coding/aqua/aquafier-js/api/prisma/schema.prisma'),
        Path('aqua/aquafier-js/api/prisma/schema.prisma'),
        Path('api/prisma/schema.prisma'),
    ]

    schema_path = None
    for path in schema_paths:
        if path.exists():
            schema_path = path
            break

    if not schema_path:
        print("Error: Could not find schema.prisma")
        print("Searched paths:")
        for path in schema_paths:
            print(f"  - {path}")
        return

    print(f"Parsing schema from: {schema_path}")

    # Parse schema
    parser = PrismaParser(str(schema_path))
    print(f"Found {len(parser.models)} models")

    # Analyze codebase for relationships
    api_root = schema_path.parent.parent  # Go up to api/ directory
    print(f"Analyzing codebase from: {api_root}")
    analyzer = CodebaseAnalyzer(str(api_root))

    # Create visualizer with codebase analysis
    visualizer = SchemaVisualizer(parser, analyzer)
    diagram = visualizer.create_diagram('schema_diagram')

    # Render
    output_path = diagram.render()
    print(f"Schema diagram generated: {output_path}")

    # Also generate a text-based summary
    print("\n" + "="*60)
    print("SCHEMA SUMMARY")
    print("="*60)

    seen_groups = set()
    for group_name in sorted(set(visualizer.DOMAIN_GROUPS.values())):
        if group_name in seen_groups:
            continue
        seen_groups.add(group_name)

        models = [m for m, g in visualizer.DOMAIN_GROUPS.items() if g == group_name]
        print(f"\n{group_name.upper()}")
        print("-" * 40)
        for model in sorted(models):
            if model in parser.models:
                field_count = len(parser.models[model]['fields'])
                print(f"  • {model:<25} ({field_count} fields)")


if __name__ == '__main__':
    main()
