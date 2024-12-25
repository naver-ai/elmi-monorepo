import { useDispatch, useSelector } from "../../../../redux/hooks"
import { Navigate, useMatch } from "react-router-dom"
import { fetchProjectDetail, projectDetailSelectors, selectDenormalizedGlossPackage, usersSelectors } from "../reducer"
import { Button, Collapse, CollapseProps, Descriptions, Divider, Table } from "antd"
import { MouseEventHandler, useCallback, useEffect, useMemo } from "react"
import { LoadingIndicator } from "../../../../components/LoadingIndicator"
import { GlossView } from "../components/GlossView"
import { LogView } from "../components/LogView"
import { ArchiveBoxArrowDownIcon } from "@heroicons/react/20/solid"
import FileSaver from "file-saver"

export const UserProjectDetailPage = () => {

    const match = useMatch("admin/users/:userId/projects/:projectId")
    let userId: string
    let projectId: string
    if(match != null){
        userId = match.params.userId!
        projectId = match.params.projectId!
    }else return <Navigate to="/admin"/>

    const user = useSelector(state => usersSelectors.selectById(state, userId))
    const projectInfo = user?.projects?.find(p => p.id == projectId)

    const isProjectLoading = useSelector(state => state.admin.users.loadingProjectDetailFlags[projectId] === true)

    const projectDetail = useSelector(state => projectDetailSelectors.selectById(state, projectId))

    const hierarchicalLyrics = useSelector(state => selectDenormalizedGlossPackage(state, projectId))

    const interactionLogs = projectDetail?.logs

    const onDownloadGlossClick = useCallback<MouseEventHandler<HTMLElement>>((ev)=>{
        ev.stopPropagation()
        if(user?.alias != null && projectInfo?.song_title != null){
            FileSaver.saveAs(new Blob([JSON.stringify(hierarchicalLyrics, null, 2)], {type: "text/plain;charset=utf-8"}), `gloss-${user?.alias}-${projectInfo?.song_title}.json`)
        }
    }, [hierarchicalLyrics, user?.alias, projectInfo?.song_title])


    const onDownloadLogsClick = useCallback<MouseEventHandler<HTMLElement>>((ev)=>{
        ev.stopPropagation()
        if(user?.alias != null && projectInfo?.song_title != null){
            FileSaver.saveAs(new Blob([JSON.stringify(interactionLogs, null, 2)], {type: "text/plain;charset=utf-8"}), `logs-${user?.alias}-${projectInfo?.song_title}.json`)
        }
    }, [interactionLogs, user?.alias, projectInfo?.song_title])

    const collapseItems: CollapseProps['items'] = useMemo(()=>{
        return projectDetail ? [
        {
            key: 'settings',
            label: <div className="flex justify-between items-center"><b>Settings</b></div>,
            children: <Descriptions items={Object.keys(projectDetail.user_settings).map(key => ({key: key, label: key, children: (projectDetail.user_settings as any)[key]}))}/>
        }, {
            key: 'gloss',
            label: <div className="flex justify-between items-center"><b>Glosses</b><Button type="text" onClick={onDownloadGlossClick}><ArchiveBoxArrowDownIcon className="w-5 h-5"/></Button></div>,
            children: <GlossView projectId={projectId}/>
        },{
            key: 'logs',
            label: <div className="flex justify-between items-center"><b>Interaction Logs</b><Button type="text" onClick={onDownloadLogsClick}><ArchiveBoxArrowDownIcon className="w-5 h-5"/></Button></div>,
            children: <LogView projectId={projectId}/>
        }] : undefined
    }, [projectDetail, projectId])


    const dispatch = useDispatch()

    useEffect(()=>{
        if(userId != null && projectId != null){
            dispatch(fetchProjectDetail(userId, projectId))
        }
    }, [userId, projectId])


    return <div className="h-full overflow-y-scroll"><div className="container mx-auto p-10">
        <div className="text-xl font-bold">{projectInfo?.song_title} - {projectInfo?.song_artist} <span className="text-xs ml-10 font-normal">Project ID: {projectInfo?.id}</span></div>
        <Divider/>
        {
            isProjectLoading ? <LoadingIndicator title="Loading project details..."/> : <Collapse size="large" items={collapseItems} defaultActiveKey={['settings', 'gloss']} destroyInactivePanel={false}/>
        }
    </div></div>
}

export default UserProjectDetailPage