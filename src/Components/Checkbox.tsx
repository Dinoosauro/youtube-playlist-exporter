import { useId } from "react"

interface Props {
    text: string,
    defaultVal?: boolean,
    callback: (checked: boolean) => void
}
export default function Checkbox({ text, callback, defaultVal }: Props) {
    const id = useId();
    return <div className="flex hcenter">
        <input type="checkbox" defaultChecked={defaultVal} onChange={(e) => callback(e.target.checked)} id={id}></input><label style={{ marginLeft: "10px" }} htmlFor={id}>{text}</label>
    </div>
}