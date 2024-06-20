import { ReactNode } from "react";

interface Props {
    children: ReactNode
}
export default function Dialog({ children }: Props) {
    return <div className="dialogContainer">
        <div className="dialog">
            <div>
                {children}
            </div>
        </div>
    </div>
}