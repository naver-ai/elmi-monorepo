import { useDispatch, useSelector } from "../../../../redux/hooks"
import { Navigate, useMatch } from "react-router-dom"
import { fetchProjectDetail, usersSelectors } from "../reducer"
import { Collapse, CollapseProps, Divider } from "antd"
import { useEffect, useMemo } from "react"
import { LoadingIndicator } from "../../../../components/LoadingIndicator"
import { GlossView } from "../components/GlossView"
import { LogView } from "../components/LogView"


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


    const collapseItems: CollapseProps['items'] = useMemo(()=>{
        return [{
            key: 'gloss',
            label: <b>Glosses</b>,
            children: <GlossView projectId={projectId}/>
        },{
            key: 'logs',
            label: <b>Interaction Logs</b>,
            children: <LogView projectId={projectId}/>
        }]
    }, [projectId])

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
            isProjectLoading ? <LoadingIndicator title="Loading project details..."/> : <Collapse size="large" items={collapseItems} destroyInactivePanel={false}/>
        }
    </div></div>
}