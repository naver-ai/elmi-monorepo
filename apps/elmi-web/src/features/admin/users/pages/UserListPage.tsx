import { useEffect, useMemo } from "react"
import { useDispatch, useSelector } from "../../../../redux/hooks"
import { fetchUsers, usersSelectors } from "../reducer"
import { Layout, Menu } from "antd"

export const UserListPage = () => {

    return <div className="container mx-auto p-10">
        Select user on the left.
    </div>
}