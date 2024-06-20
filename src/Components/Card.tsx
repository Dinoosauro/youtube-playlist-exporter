import { ReactNode } from "react";

interface Props {
    children: ReactNode,
    type?: 0 | 1
}
export default function Card({ children, type }: Props) {
    return <div className="card" style={{ backgroundColor: type === 1 ? "var(--table)" : undefined }}>
        {children}
    </div>
}