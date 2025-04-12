import { Provider } from "../components/ui/provider"
import { IMainProvider } from "../types/componentTypes"


const MainProvider = ({children}: IMainProvider) => {
  return (
    <Provider>
        {children}
    </Provider>
  )
}

export default MainProvider