import { useState } from "react";
import { useMatch } from "react-router-dom";

export function useProjectIdInRoute(): string | undefined {
    const match = useMatch("/app/projects/:project_id")

    return match?.params.project_id
}