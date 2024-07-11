import { useDispatch, useSelector } from "../../../redux/hooks"
import { useCallback, useEffect, useMemo } from "react"
import { fetchProjectInfos, projectsEntitySelectors } from "../reducer"
import { SignedInScreenFrame } from "../../../components/SignedInScreenFrame"
import { Card, Space, Spin } from "antd"
import { useNavigate } from "react-router-dom"

const ProjectCard = (props: {id: string}) => {
    const project = useSelector(state => projectsEntitySelectors.selectById(state, props.id))

    const accessMessage = useMemo(()=>{
        if(project.last_accessed_at != null){
            return project.last_accessed_at
        }else{
            return "Not opened yet"
        }
    }, [project?.last_accessed_at])

    const nav = useNavigate()

    const onEnter = useCallback(()=>{
        nav(`/app/projects/${props.id}`)
    }, [nav, props.id])

    return <Card bordered={false} size="default" className="" loading={project == null} hoverable onClick={onEnter}>
        <Card.Meta title={project?.song_title} description={<span className="font-bold">{project?.song_artist}</span>}/>
        <Card.Meta className="text-xs pt-2" description={accessMessage}/>
    </Card>
}

export const ProjectsPage = () => {

    const dispatch = useDispatch()

    const projectIds = useSelector(projectsEntitySelectors.selectIds)

    const isLoadingProjects = useSelector(state => state.projects.loadingProjects)

    useEffect(()=>{
        dispatch(fetchProjectInfos())
    }, [])

    return <SignedInScreenFrame>
        {
            isLoadingProjects == true? <div className="flex m-10 items-center justify-center"><Spin size="large" className="mr-6"/><span className="text-gray-600">Loading projects...</span></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 container mx-auto px-6 py-10">
            {
                projectIds.map(id => <ProjectCard key={id} id={id}/>)
            }
        </div>
        }
    </SignedInScreenFrame>
}