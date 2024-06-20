import { useId } from "react"

interface Props {
    description?: string,
    callback: (value: string) => void,
    type?: "text" | "number",
    defaultVal?: string
}
export default function Input({ description, callback, type = "text", defaultVal }: Props) {
    const forId = useId();
    return <>
        <div className="flex hcenter">
            {description && <label style={{ marginRight: "10px" }} htmlFor={forId}>{description}</label>}
            <input defaultValue={defaultVal} onChange={(e) => callback(e.target.value)} type={type} id={description ? forId : undefined}></input>
        </div>
    </>
}