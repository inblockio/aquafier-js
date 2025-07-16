import { Link as RouterLink, useResolvedPath, useMatch } from 'react-router-dom';

const CustomNavLink = ({ item, index, callBack }: { item: any, index: number, callBack?: () => void }) => {

    let resolved = useResolvedPath(item.id);
    let match = useMatch({ path: resolved.pathname, end: true });

    return (
        <RouterLink
            key={index}
            to={item.id}
            data-testid={"nav-link-"+index}
            className={`flex items-center space-x-3 px-3 py-3 rounded-md text-sm ${match
                ? `text-gray-900 font-medium bg-orange-100/80 border-l-3 border-orange-500`   // Subtle active state
                : 'text-gray-900 hover:bg-orange-100/80'          // Default state
                }`}
            onClick={() => {
                callBack?.()
            }}
        >
            {item.icon && <item.icon className="w-4 h-4" />}
            <span>{item.label}</span>
        </RouterLink>
    )
}

export default CustomNavLink