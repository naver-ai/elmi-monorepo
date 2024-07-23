import { Button, Divider, Layout, Typography } from "antd"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { useCallback, useMemo } from "react";
import { selectLineAnnotationByLineId, setDetailLineId } from "../reducer";
import { LeftDoubleArrowIcon } from "../../../components/svg-icons";
import { LineAnnotation } from "apps/elmi-web/src/model-types";
const { Title } = Typography;

export const LyricDetailPanel = () => {

    const lineId = useSelector(state => state.editor.detailLineId)

    const annotation: LineAnnotation | undefined = useSelector(state => selectLineAnnotationByLineId(state, lineId || ""))


    const dispatch = useDispatch()

    const onClickClose = useCallback(()=>{
        dispatch(setDetailLineId(undefined))
    }, [])

    return <div className={`line-detail-panel relative shadow-lg bg-[#fafafa] w-[350px] max-w-[30vw] block transition-all ${lineId != null ? "":"!w-0"}`}>
        <div className={`transition-transform w-[350px] max-w-[30vw] absolute top-0 right-0 bottom-0`}>
            <div className="h-full">
                <div className="p-1 pl-3 top-0 left-0 right-0 flex justify-between items-center border-b-[1px]">
                    <span className="panel-title">Line Detail</span>
                    <Button onClick={onClickClose} className="p-2" type="text"><LeftDoubleArrowIcon className="h-6 w-6 fill-gray-400"/></Button>
                </div>
                <div className="p-3 overflow-y-scroll">
                    <Divider orientation="left" plain rootClassName="!mt-0">
                        <h4>Music Video</h4>
                    </Divider>
                    <Divider orientation="left" plain>
                        <h4>Mood</h4>
                    </Divider>
                    {
                        annotation != null ? <div>
                            <div className="flex flex-wrap gap-2">{annotation.mood.map((mood, i) => <div key={i} className="text-black">#{mood}</div>)}</div>
                            <p className="mt-3 font-light italic">{annotation.emotion_description}</p>
                            </div> : null
                    }
                </div>
            </div>
        </div>
    </div>   
}