import { Component, onMount } from 'solid-js';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import 'highlight.js/styles/atom-one-dark.css';

// Register JSON language
hljs.registerLanguage('json', json);

export const JsonCodeBlock: Component<{ code: string }> = (props) => {
  let codeRef: HTMLElement | undefined;

  onMount(() => {
    if (codeRef) {
      hljs.highlightElement(codeRef);
    }
  });

  return (
    <div class="box-border h-[380px] overflow-y-auto">
      <pre style={{ padding: 'calc(var(--spacing) * 6)' }}>
        <code 
          ref={codeRef} 
          class="language-json"
        >
          {props.code}
        </code>
      </pre>
    </div>
  );
};

// Usage - Direct replacement
