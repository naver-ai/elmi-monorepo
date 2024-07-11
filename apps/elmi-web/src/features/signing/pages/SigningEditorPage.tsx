import { useSelector } from "../../../redux/hooks"
import { SignedInScreenFrame } from "../../../components/SignedInScreenFrame"
import { useProjectIdInRoute } from "../hooks"
import { projectsEntitySelectors } from "../../projects/reducer"
import {ArrowLeftStartOnRectangleIcon} from '@heroicons/react/20/solid'
import { Button } from "antd"
import { useNavigate } from "react-router-dom"
import { useCallback } from "react"

export const SigningEditorPage = () => {

    const nav = useNavigate()

    const projectId = useProjectIdInRoute()!
    const projectInfo = useSelector(state => projectsEntitySelectors.selectById(state, projectId))
    console.log(projectId, projectInfo)

    const onToListClick = useCallback(()=>{
        nav("/app/projects")
    }, [])

    return <SignedInScreenFrame headerContent={<div className="flex flex-row items-center h-full">
            <Button className="aspect-square h-full block rounded-none p-0 items-center justify-center flex text-slate-500 border-r-[1px] border-r-slate-200" type="text" onClick={onToListClick}><ArrowLeftStartOnRectangleIcon className="w-5 h-5"/></Button>
            {
                projectInfo != null ? <div>
                <span className="ml-3 font-bold text-lg">{projectInfo?.song_title}</span> - {projectInfo?.song_artist}
            </div> : null
            }
        </div>}>

    </SignedInScreenFrame>
}