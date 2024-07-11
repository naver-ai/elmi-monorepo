import { useDispatch, useSelector } from "../../../redux/hooks"
import { useEffect } from "react"
import { fetchProjectInfos, projectsEntitySelectors } from "../reducer"
import { SignedInScreenFrame } from "../../../components/SignedInScreenFrame"
import { Card } from "antd"

const ProjectCard = (props: {id: string}) => {
    const project = useSelector(state => projectsEntitySelectors.selectById(state, props.id))

    return <Card bordered={false}>
        <Card.Meta title={project?.song_title} description={project?.song_artist}/>
    </Card>
}

export const ProjectsPage = () => {

    const dispatch = useDispatch()

    const projectIds = useSelector(projectsEntitySelectors.selectIds)

    useEffect(()=>{
        dispatch(fetchProjectInfos())
    }, [])

    return <SignedInScreenFrame>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 container mx-auto px-6 py-10">
            {
                projectIds.map(id => <ProjectCard key={id} id={id}/>)
            }
        </div>
    </SignedInScreenFrame>
}