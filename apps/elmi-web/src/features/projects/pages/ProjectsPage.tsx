import { useDispatch, useSelector } from "../../../redux/hooks"
import { useCallback, useEffect, useMemo, useState } from "react"
import { fetchProjectInfos, fetchSongs, projectsEntitySelectors } from "../reducer"
import { SignedInScreenFrame } from "../../../components/SignedInScreenFrame"
import { Card, Image, Space, Spin } from "antd"
import { useNavigate } from "react-router-dom"
import { useNetworkImageSource } from "../hooks"
import { Http } from "../../../net/http"
import { PlusIcon } from "@heroicons/react/24/solid"
import { ProjectCreationModal } from "../components/ProjectCreationModal"

const CARD_CLASSNAME = "transition hover:shadow-lg hover:scale-105 cursor-pointer"

const ProjectCard = (props: {id: string}) => {
    const project = useSelector(state => projectsEntitySelectors.selectById(state, props.id))

    const coverUrl = useMemo(()=>{
        if(project?.song_id != null){
            return Http.getTemplateEndpoint(Http.ENDPOINT_APP_MEDIA_SONGS_ID_COVER, {song_id: project.song_id})
        }else return undefined
    }, [project])

    const coverImageSource = useNetworkImageSource(coverUrl, "cover.jpg")

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

    return <Card bordered={false} size="default" className={CARD_CLASSNAME} 
        loading={project == null} onClick={onEnter} cover={<Image src={coverImageSource || undefined} preview={false}/>}>
        <Card.Meta title={project?.song_title} description={<span className="font-bold">{project?.song_artist}</span>}/>
        <Card.Meta className="text-xs pt-2" description={accessMessage}/>
    </Card>
}

const NewProjectButton = (props: {
    onClick: ()=>void
}) => {
    return <Card onClick={props.onClick} bordered={false} size="default" className={CARD_CLASSNAME} cover={<div className="aspect-square bg-slate-100 rounded-t-lg !flex justify-center items-center"><PlusIcon className="w-10 h-10 text-gray-400"/></div>}>
        <Card.Meta title={<span className="text-center">Add new project</span>}/>
    </Card>
}

export const ProjectsPage = () => {

    const dispatch = useDispatch()

    const [isProjectCreationModalOpen, setIsProjectCreationModalOpen] = useState<boolean>(false)

    const projectIds = useSelector(projectsEntitySelectors.selectIds)

    const isLoadingProjects = useSelector(state => state.projects.loadingProjects)

    const onModalClose = useCallback(()=>{
        setIsProjectCreationModalOpen(false)
    }, [])

    const onNewProjectButtonClick = useCallback(()=>{
        dispatch(fetchSongs())
        setIsProjectCreationModalOpen(true)
    }, [])

    useEffect(()=>{
        dispatch(fetchProjectInfos())
    }, [])

    return <SignedInScreenFrame>
        {
            isLoadingProjects == true? <div className="flex m-10 items-center justify-center"><Spin size="large" className="mr-6"/><span className="text-gray-600">Loading projects...</span></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 container mx-auto px-6 py-10">
            {
                projectIds.map(id => <ProjectCard key={id} id={id}/>)
            }
            <NewProjectButton onClick={onNewProjectButtonClick}/>
        </div>
        }
        <ProjectCreationModal isOpen={isProjectCreationModalOpen} onClose={onModalClose}/>
    </SignedInScreenFrame>
}