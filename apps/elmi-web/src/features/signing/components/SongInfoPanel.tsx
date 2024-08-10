import { Divider } from "antd"
import { useSelector } from "../../../redux/hooks"
import { Fragment } from "react"

export const SongInfoPanel = () => {

    const songDescription = useSelector(state => state.editor.song?.description)

    return <Fragment>
        <Divider orientation="left" plain className="!mt-0">
            <h4>About</h4>
        </Divider>
        <div className="detail-panel-content-wrapper">
            {
                songDescription != null ? <>
                <p className="font-regular italic leading-7">{songDescription}</p>
                <p className="mt-3 text-sm text-gray-400">Description & lyrics from <i>genius.com</i></p></> : null
            }
            
        </div>

    </Fragment>
}