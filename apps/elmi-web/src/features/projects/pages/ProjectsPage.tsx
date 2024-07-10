import { useSelector } from "../../../redux/hooks"
import { useEffect } from "react"
import { projectsEntitySelectors } from "../reducer"

export const ProjectsPage = () => {

    const projectIds = useSelector(projectsEntitySelectors.selectIds)

    useEffect(()=>{
        
    }, [])

    return <div>Project list page</div>
}