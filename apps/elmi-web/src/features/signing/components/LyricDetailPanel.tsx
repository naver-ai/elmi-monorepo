import { Button, Layout, Typography } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { useCallback } from "react";
import { setDetailLineId } from "../reducer";
import { ArrowsPointingInIcon } from "@heroicons/react/20/solid";
const { Title } = Typography;

export const LyricDetailPanel = () => {

    const lineId = useSelector(state => state.editor.detailLineId)
    const dispatch = useDispatch()

    const onClickClose = useCallback(()=>{
        dispatch(setDetailLineId(undefined))
    }, [])

    return <div className={`relative shadow-lg bg-white w-[350px] max-w-[30vw] block transition-all ${lineId != null ? "":"w-0"}`}>
        <div className={`transition-transform w-[350px] max-w-[30vw] absolute top-0 right-0 bottom-0`}>
            <div className="h-full">
                <div className="p-1 top-0 left-0 right-0 flex justify-between items-center shadow-sm border-b-[1px]">
                    <span className="panel-title ml-1">Line Detail</span>
                    <Button onClick={onClickClose} className="p-2" type="text"><ArrowsPointingInIcon className="h-5 w-5 text-gray-400"/></Button>
                </div>
                <div className="p-2 overflow-y-scroll">
                    <Title level={4}>Music Video</Title>
                    <Title level={4}>Emotions</Title>
                    <Title level={4}>Emotion</Title>
                </div>
            </div>
        </div>
    </div>   
}