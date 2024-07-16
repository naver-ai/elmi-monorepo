import { Button, Layout, Typography } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { useCallback } from "react";
import { setDetailLineId } from "../reducer";
import { LeftDoubleArrowIcon } from "../../../components/svg-icons";
const { Title } = Typography;

export const LyricDetailPanel = () => {

    const lineId = useSelector(state => state.editor.detailLineId)
    const dispatch = useDispatch()

    const onClickClose = useCallback(()=>{
        dispatch(setDetailLineId(undefined))
    }, [])

    return <div className={`relative shadow-lg bg-[#fafafa] w-[350px] max-w-[30vw] block transition-all ${lineId != null ? "":"!w-0"}`}>
        <div className={`transition-transform w-[350px] max-w-[30vw] absolute top-0 right-0 bottom-0`}>
            <div className="h-full">
                <div className="p-1 pl-3 top-0 left-0 right-0 flex justify-between items-center border-b-[1px]">
                    <span className="panel-title">Line Detail</span>
                    <Button onClick={onClickClose} className="p-2" type="text"><LeftDoubleArrowIcon className="h-6 w-6 fill-gray-400"/></Button>
                </div>
                <div className="p-3 overflow-y-scroll">
                    <Title level={5}>Music Video</Title>
                    <Title level={5}>Emotions</Title>
                    <Title level={5}>Emotion</Title>
                </div>
            </div>
        </div>
    </div>   
}