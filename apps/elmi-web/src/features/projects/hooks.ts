import { useEffect, useState } from "react"
import { useSelector } from "../../redux/hooks"
import { Http } from "../../net/http"

export function useNetworkImageSource(endpoint: string | undefined, fileName: string | undefined) : string | null{
    const [imageSource, setImageSource] = useState<null | string>(null)

    const token = useSelector(state => state.auth.token)

    useEffect(() => {
        if (endpoint != null && token != null && fileName != null) {
            const loadImage = async () => {
                try {
                    const response = await Http.axios.get(endpoint, {
                        headers: await Http.getSignedInHeaders(token),
                        responseType: 'blob'
                    })

                    const file = new File([response.data], fileName)
                    var reader = new FileReader()
                    reader.addEventListener("load", () => {
                        setImageSource(reader.result!.toString())
                    })
                    reader.readAsDataURL(file)


                } catch (ex) {
                    console.log("Image loading error - ", ex)
                }
            }
            loadImage().then()
        }
    }, [endpoint, token, fileName])

    return imageSource
}