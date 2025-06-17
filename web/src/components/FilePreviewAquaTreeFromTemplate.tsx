import { Table, Text } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { makeProperReadableWord } from '../utils/functions';
import { ClipboardIconButton, ClipboardRoot } from './chakra-ui/clipboard';


export const FilePreviewAquaTreeFromTemplateOne = ({ userData }: { userData: Record<string, string> }) => {
  // Default data if props aren't provided
  //   const defaultData = {
  //     name: "kenn",
  //     surname: "kamau",
  //     type: "awsome",
  //     date_of_birth: "11.05.2024",
  //     wallet_address: "0x677e5E9a3badb280d7393464C09490F813d6d6ef",
  //     email: "kamaukenn11@gmail.com",
  //   };

  useEffect(() => {
    injectGlobalStyles();
  }, []);

  // const data = userData || {};

  // State for dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // State for copy confirmation
  // const [copyState, setCopyState] = useState({
  //   email: false,
  //   wallet: false
  // });

  // Check local storage for theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  // Update local storage when theme changes
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Format date helper
  // const formatDate = (dateString: string) => {
  //   const [day, month, year] = dateString.split('.');
  //   const months = [
  //     'January', 'February', 'March', 'April', 'May', 'June',
  //     'July', 'August', 'September', 'October', 'November', 'December'
  //   ];
  //   return `${parseInt(day)} ${months[parseInt(month) - 1]}, ${year}`;
  // };

  // Copy to clipboard handler
  // const handleCopy = async (text : string, type : any) => {
  //   try {
  //     await navigator.clipboard.writeText(text);

  //     // Set copy state for specific field
  //     setCopyState(prev => ({
  //       ...prev,
  //       [type]: true
  //     }));

  //     // Reset after animation
  //     setTimeout(() => {
  //       setCopyState(prev => ({
  //         ...prev,
  //         [type]: false
  //       }));
  //     }, 2000);
  //   } catch (err) {
  //     console.error('Failed to copy text: ', err);
  //   }
  // };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <button
        className={`fixed top-4 right-4 p-2 rounded-full cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
        aria-label="Toggle theme"
        onClick={toggleDarkMode}
      >
        {isDarkMode ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>

      <div className="p-6">
        {
          Object.keys(userData).map((keyItem) => {

            return <div className={`p-4 rounded-xl mb-4 transition-transform hover:scale-101 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2 text-xs font-medium mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-500'}>
                  {keyItem}
                </span>
              </div>
              <div className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-800'}`}>
                {/* {formatDate(data.date_of_birth)} */}
                {userData[keyItem]}
              </div>
            </div>
          })

        }

      </div>

    </div>
  );
};

// Add keyframes for fadeIn animation
const injectGlobalStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .animate-fadeIn {
      animation: fadeIn 0.6s ease-out;
    }
    
    .hover\\:scale-101:hover {
      transform: scale(1.01);
    }
  `;
  document.head.appendChild(style);
};

// Usage Example:
// const App = () => {


//   // You can pass user data as props
//   const userData = {
//     name: "kenn",
//     surname: "kamau",
//     type: "awsome",
//     date_of_birth: "11.05.2024",
//     wallet_address: "0x677e5E9a3badb280d7393464C09490F813d6d6ef",
//     email: "kamaukenn11@gmail.com",
//   };

//   return ;
// };

// export default App;

export const FilePreviewAquaTreeFromTemplate = ({ formData }: { formData: Record<string, string> }) => {

  let keys = Object.keys(formData)

  const checkCopyButtonVisibility = (formKey: string) => {
    const fieldsToWatch = ["address", "hash"]
    let isVisible = false
    // Loop through fields to watch and make formKey lowercase then check if it includes the fields to watch
    for (let field of fieldsToWatch) {
      if (formKey.toLowerCase().includes(field)) {
        isVisible = true
        break
      }
    }
    return isVisible
  }

  const renderItemValue = (value: any) => {
    if (typeof value === "object") {
      return <Text key={JSON.stringify(value)} fontSize={"sm"}>{JSON.stringify(value)}</Text>
    }
    else if (typeof value === "string" && value.includes(",")) {
      return value.split(",").map((item: string) => (
        <Text key={item} fontSize={"sm"}>{item}</Text>
      ))
    }
    else if (typeof value === "number") {
      return <Text key={value} fontSize={"sm"} wordBreak={"break-all"} whiteSpace={"pre-wrap"}>{value}</Text>
    }
    return <Text key={value} fontSize={"sm"} wordBreak={"break-all"} whiteSpace={"pre-wrap"}>{value}</Text>
  }

  return (
    <>
      <Table.Root variant={"outline"} borderRadius={"xl"} interactive>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader fontWeight={600}>Field</Table.ColumnHeader>
            <Table.ColumnHeader fontWeight={600}>Value</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {
            keys.sort().map((keyItem, index: number) => (
              <Table.Row key={`item_${index}_${keyItem}`}>
                <Table.Cell>{makeProperReadableWord(keyItem)}</Table.Cell>
                <Table.Cell>
                    {
                      renderItemValue(formData[keyItem])
                    }
                  <ClipboardRoot value={formData[keyItem]} hidden={!checkCopyButtonVisibility(keyItem)} w={"fit-content"}>
                    <ClipboardIconButton size={'2xs'} />
                  </ClipboardRoot>
                </Table.Cell>
              </Table.Row>
            ))
          }
        </Table.Body>
      </Table.Root>
    </>
  )
}