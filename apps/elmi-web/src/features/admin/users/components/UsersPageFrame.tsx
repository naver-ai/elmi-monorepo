import { useCallback, useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "../../../../redux/hooks"
import { fetchUsers, usersSelectors } from "../reducer"
import { Layout, Menu, MenuProps, } from "antd"
import { Outlet, useMatch, useNavigate, useNavigationType } from "react-router-dom"
import { MenuItemType } from "antd/es/menu/interface"

export const UsersPageFrame = () => {

    const navigate = useNavigate()

    const users = useSelector(usersSelectors.selectAll)

    const match = useMatch("admin/users/:userId/projects/:projectId")

    const menuItems = useMemo(()=>{
        return users.map(user => {
            return {
                key: user.id,
                label: <div className="select-none"><b>{user.alias}</b> <span>({user.callable_name})</span></div>,
                children: user.projects.map(project => {
                    return {
                        key: project.id,
                        label: <div className="select-none">
                                <b>{project.song_title}</b> <span>({project.song_artist})</span>
                                </div>
                    }
                })
            }
        })
    }, [users])

    const onSelectMenu = useCallback((ev:{keyPath: Array<string>, key: string})=>{
        const [projectId, userId] = ev.keyPath
        navigate(`/admin/users/${userId}/projects/${projectId}`)
    }, [navigate])

    const dispatch = useDispatch()

    useEffect(()=>{
        dispatch(fetchUsers())
    }, [])

    return <Layout className="h-lvh">
        <Layout.Sider width={300}>
            <Menu
                className="h-full overflow-y-scroll"
                mode="inline"
                items={menuItems}
                onSelect={onSelectMenu}
                defaultOpenKeys={match != null ? [match.params.userId!] : undefined}
                defaultSelectedKeys={match != null ? [match.params.projectId!] : undefined}
                />
        </Layout.Sider>
        <Layout.Content className="bg-[#fafafa]">
            <Outlet/>
        </Layout.Content>
    </Layout>
}

export default UsersPageFrame