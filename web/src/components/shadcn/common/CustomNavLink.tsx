import { Link as RouterLink, useResolvedPath, useMatch } from 'react-router-dom';

const CustomNavLink = ({ item, index }: { item: any, index: number }) => {

    let resolved = useResolvedPath(item.id);
    let match = useMatch({ path: resolved.pathname, end: true });

    return (
        <RouterLink
            key={index}
            to={item.id}
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm ${match
                ? 'text-white font-medium'   // White text for better contrast
                : 'text-gray-700 hover:bg-gray-100'          // Default state (unchanged)
                }`}
            style={match ? { backgroundColor: '#E55B1F' } : {}}
        >
            {item.icon && <item.icon className="w-4 h-4" />}
            <span>{item.label}</span>
        </RouterLink>
    )
}

export default CustomNavLink