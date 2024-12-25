import { useCallback } from "react";
import { LyricDetailPanel } from "./LyricDetailPanel";
import { useSelector } from "../../../redux/hooks"
import { ArrowLeftStartOnRectangleIcon } from '@heroicons/react/20/solid'
import { Button } from "antd"
import { useNavigate } from "react-router-dom"
import { SongInfoPanel } from "./SongInfoPanel";
import { GrandientBorderline } from "../../../components/decorations";
import LinesEllipsis from 'react-lines-ellipsis'
import responsiveHOC from 'react-lines-ellipsis/lib/responsiveHOC'
const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis)

const HeaderContent = () => {

    const songInfo = useSelector(state => state.editor.song)

    const nav = useNavigate()

    const onToListClick = useCallback(() => {
        nav("/app/projects")
    }, [])

    return <div className="flex flex-row items-center h-14 relative pr-1">
        <Button className="aspect-square h-full rounded-none p-0 items-center justify-center flex text-slate-500 border-r-[1px] border-r-slate-200" type="text" onClick={onToListClick}><ArrowLeftStartOnRectangleIcon className="w-5 h-5" /></Button>
        {
            songInfo != null ? <div className="px-2">
                <ResponsiveEllipsis className="font-bold" text={songInfo?.title} maxLine={1} />
                <ResponsiveEllipsis className="text-sm" text={songInfo?.artist} maxLine={1} />
            </div> : null
        }
        <div className="flex-1" />
        <GrandientBorderline/>
    </div>
}

export const InfoSidebar = () => {

    const selectedLineId = useSelector(state => state.editor.detailLineId)

    return <div className={`line-detail-panel relative border-r-[1px] bg-[#fafafa] w-[350px] max-w-[30vw] h-screen flex flex-col`}>
        <HeaderContent />
        <div className="p-3 overflow-y-auto flex-1">
            {
                selectedLineId != null ? <LyricDetailPanel lineId={selectedLineId} /> : <SongInfoPanel/>
            }
        </div>
    </div>
}