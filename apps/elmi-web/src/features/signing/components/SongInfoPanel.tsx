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
            <p className="font-regular italic px-2 leading-7">{songDescription}</p>
        </div>

        <Divider orientation="left" plain><h4>Reference Video</h4></Divider>

        <Divider orientation="left" plain><h4>Performance Videos</h4></Divider>

        <Divider orientation="left" plain><h4>Signing Covers (ASL/PSE)</h4></Divider>

    </Fragment>
}