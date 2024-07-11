import { Button, Dropdown, Layout, MenuProps } from "antd"
import { useDispatch, useSelector } from "../redux/hooks"
import { useMemo } from "react"
import { initializeAuth } from "../features/auth/reducer"

const UserProfile = () => {

    const dispatch = useDispatch()

    const userName = useSelector(state => state.auth.user?.callable_name)

    const menuData: MenuProps = useMemo(() => {
        return {
            items: [{
                key: 'logout',
                danger: true,
                label: "Sign Out"
            }],
            onClick: (ev) => {
                switch (ev.key) {
                    case "logout":
                        dispatch(initializeAuth())
                        break;
                }
            }
        }
    }, [])

    return <Dropdown menu={menuData}>
        <Button size="small" type="default">{userName}</Button>
    </Dropdown>
}

export const SignedInScreenFrame = (props: {
    headerContent?: any
    children?: any
}) => {

    return <div className="h-[100vh]">
        <header className={`bg-white shadow-sm h-10 p-0 px-3 flex flex-row justify-between items-center`}>
            {props.headerContent ? props.headerContent : <div className="text-lg font-black text-slate-600">ELMI</div>}
            <UserProfile />
        </header>
        <div className="overflow-scroll">
            {props.children}
        </div>
    </div>
}