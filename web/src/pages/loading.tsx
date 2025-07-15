import { useEffect } from "react"


const Loading = () => {

    // Pull reload true parameter from the URL if it exists do the reload and remove the parameter from the URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const reload = urlParams.get('reload')
        if (reload) {
            window.location.href = "/app"
        }
    }, [])

    return (
        <>
            Loading...
        </>
    )
}

export default Loading