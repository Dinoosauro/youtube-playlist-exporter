import { useEffect, useRef, useState } from "react";
import Header from "./Components/Header";
import Input from "./Components/Input";
import Card from "./Components/Card";
import Checkbox from "./Components/Checkbox";
import { createRoot } from "react-dom/client";
import Dialog from "./Components/Dialog";
interface State {
  isKey: boolean,
  authentication?: string,
  playlist?: string,
  playlistItems: YoutubeCommonInterface["items"],
  hasFetchingEnded?: boolean
}
interface ThumbnailInterface {
  url: string,
  width: number,
  height: number
}
interface YoutubeCommonInterface {
  nextPageToken?: string,
  items: {
    snippet: {
      publishedAt: string,
      channelId: string,
      title: string,
      description: string,
      videoOwnerChannelTitle: string,
      thumbnails: {
        default: ThumbnailInterface
        medium: ThumbnailInterface
        high: ThumbnailInterface
        standard: ThumbnailInterface
        maxres: ThumbnailInterface
      }
    },
    contentDetails: {
      videoId: string
    }
    __avoidExporting?: boolean
  }[]
}


export default function App() {
  let [state, updateState] = useState<State>({ isKey: localStorage.getItem("PlaylistExporter-UseKeyAuth") !== "b", playlistItems: [] });
  /**
   * The Client ID or the Key the user has provided
   */
  let clientIdSelected = useRef<string>(localStorage.getItem("PlaylistExporter-Key") ?? "");
  /**
   * The playlist the user has chosen
   */
  let playlistSelected = useRef<string>("");
  /**
   * If the user has pressed "Shift", so that multiple checkboxes/sliders can be ticked/unticked
   */
  let isShiftPressed = useRef<boolean>(false);
  /**
   * The number on the table array that was clicked. This is done to calculate which checkboxes must be ticked or unticked if Shift is pressed.
   */
  let clickedTableNumber = useRef<number>(-1);
  /**
   * The array of table refs, so that the checkbox can be fetched
   */
  let tableArr = useRef<(HTMLTableRowElement | null)[]>([]);
  /**
   * A reference of every YouTube video item fetched, so that we won't direclty edit the value in the State when the "Avoid exporting this" checkbox is ticked
   */
  let playlistVideoArr = useRef<YoutubeCommonInterface["items"]>([]);
  /**
   * A string with a number ("0", "1" etc.) that indicates the syntax for the playlist exportation
   */
  let exportMethod = useRef<string>(localStorage.getItem("PlaylistExporter-SaveMethod") ?? "0");
  useEffect(() => { // Update the `playlistVideoArr` array with the new items
    playlistVideoArr.current.push(...state.playlistItems.slice(playlistVideoArr.current.length));
    console.log(playlistVideoArr.current.length, state.playlistItems.length);
  }, [state.playlistItems])
  useEffect(() => {
    window.onmessage = (msg) => { // Get access token from OAuth authentication
      if (msg.origin === window.location.origin) {
        let token: string = msg.data.substring(msg.data.indexOf("access_token=") + "access_token=".length);
        if (token.indexOf("&") !== -1) token = token.substring(0, token.indexOf("&"));
        updateState(prevState => { return { ...prevState, authentication: token } });
      }
    };
    // Track if the user presses Shift or not
    window.onkeydown = ({ key }) => {
      if (key === "Shift") isShiftPressed.current = true;
    }
    window.onkeyup = ({ key }) => {
      if (key === "Shift") isShiftPressed.current = false;
    }
  }, [])
  useEffect(() => localStorage.setItem("PlaylistExporter-UseKeyAuth", state.isKey ? "a" : "b"), [state.isKey]); // Save the preference for the key
  return <>
    <Header></Header><br></br>
    {!state.authentication ? <Card>
      <h2>Authentication:</h2>
      <Checkbox defaultVal={!state.isKey} text="Use OAuth instead of API key" callback={(e) => updateState(prevState => { return { ...prevState, isKey: !e } })}></Checkbox><br></br>
      <Input defaultVal={clientIdSelected.current} description={state.isKey ? "YouTube API Key" : "Google API Client ID"} callback={(e) => { clientIdSelected.current = e; localStorage.setItem("PlaylistExporter-Key", e) }}></Input><br></br>
      <button onClick={() => {
        state.isKey ? updateState(prevState => { return { ...prevState, authentication: clientIdSelected.current } }) : window.open(`https://accounts.google.com/o/oauth2/v2/auth?scope=${encodeURIComponent("https://www.googleapis.com/auth/youtube.readonly")}&include_granted_scopes=true&redirect_uri=${encodeURIComponent(`${window.location.href.substring(0, window.location.href.lastIndexOf("/"))}/oauth.html`)}&response_type=token&client_id=${encodeURIComponent(clientIdSelected.current)}`, "_blank", `width=600,height=400`);
      }}>Continue</button><br></br><br></br>
      <p>Need help? <a href="./apiInstructions.html" target="_blank">Click here for a step-by-step guide</a></p>
    </Card> : !state.playlist ? <Card>
      <h2>Playlist link:</h2>
      <Input description="Playlist URL" callback={(e) => playlistSelected.current = e}></Input><br></br>
      <button onClick={() => {
        if (playlistSelected.current.indexOf("list=") !== -1) playlistSelected.current = playlistSelected.current.substring(playlistSelected.current.indexOf("list=") + 5);
        if (playlistSelected.current.indexOf("&") !== -1) playlistSelected.current = playlistSelected.current.substring(0, playlistSelected.current.indexOf("&"));
        const standardLink = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,id,snippet,status&playlistId=${encodeURIComponent(playlistSelected.current)}&${state.isKey ? "key" : "access_token"}=${state.authentication}&maxResults=50`;
        /**
         * Make a `playlistItems` request to the YouTube API
         * @param page the part to add at the end of the request, so that multiple pages can be fetched
         */
        async function makeRequest(page: string) {
          const req = await fetch(`${standardLink}${page}`);
          const res = await req.json() as YoutubeCommonInterface;
          updateState(prevState => { return { ...prevState, playlistItems: [...prevState.playlistItems, ...res.items], hasFetchingEnded: !res.nextPageToken, playlist: playlistSelected.current } });
          res.nextPageToken && makeRequest(`&pageToken=${res.nextPageToken}`);
        }
        makeRequest("");
      }}>Get playlist items</button>
    </Card> : <Card>
      <h2>{state.hasFetchingEnded ? "Your playlist items:" : "Fetching data..."}</h2><br></br>
      <button onClick={() => {
        const div = document.createElement("div");
        const root = createRoot(div);
        root.render(<Dialog>
          <h2>Export content</h2>
          <p>Choose from the Select below how the content should be saved</p>
          <select defaultValue={exportMethod.current} onChange={(e) => exportMethod.current = e.target.value}>
            {["Save links as a TXT", "Save video IDs as a TXT", "Save links with video IDs, video owner and title in a CSV file", "Save links with video information and the best thumbnail in a CSV file", "Save links with video information and every thumbnail in a CSV File"].map((e, i) => <option key={`PlaylistExporter-ExportOptions-${i}`} value={i}>{e}</option>)}
          </select><br></br><br></br>
          <button onClick={() => {
            const allowedItems = playlistVideoArr.current.filter(e => !e.__avoidExporting);
            let output = "";
            function safeComma(str: string) {
              return str.replace(/\"/g, `""`);
            }
            switch (exportMethod.current) {
              case "0": // Playlist video URLs
                output = allowedItems.map(item => `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`).join("\n");
                break;
              case "1": // Playlist IDs
                output = allowedItems.map(item => item.contentDetails.videoId).join("\n");
                break;
              case "2": // Playlist video URLs + IDs + Titles + Owners
                output = `"Link","Video ID","Title","Owner"\n${allowedItems.map(item => `"https://youtube.com/watch?v=${item.contentDetails.videoId}","${item.contentDetails.videoId}","${safeComma(item.snippet.title)}","${safeComma(item.snippet.videoOwnerChannelTitle)}"`).join("\n")}`;
                break;
              case "3": case "4": // Playlist video URLs + IDs + Titles + Owners + Pubblication dates + Thumbnails (3 = Best; 4 = Every thumbnail)
                output = `"Link","Video ID","Title","Description","Owner","Published at","${exportMethod.current === "3" ? "Best" : "Available"} thumbnail(s)"\n${allowedItems.map(item => `"https://www.youtube.com/watch?v=${item.contentDetails.videoId}","${item.contentDetails.videoId}","${safeComma(item.snippet.title)}","${safeComma(item.snippet.description)}","${safeComma(item.snippet.videoOwnerChannelTitle)}","${safeComma(item.snippet.publishedAt)}","${safeComma(exportMethod.current === "3" ? Object.values(item.snippet.thumbnails).sort((a, b) => b.width - a.width)[0].url : (Object.values(item.snippet.thumbnails).reverse().map(item => item.url).join("\n")))}"`).join("\n")}`;
                break;
            }
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([output]));
            a.download = `${state.playlist}.${+exportMethod.current < 2 ? "txt" : "csv"}`;
            a.click();
            (div.querySelector(".dialogContainer") as HTMLDivElement).style.opacity = "0";
            setTimeout(() => root.unmount(), 210);
          }}>Save file</button>
        </Dialog>)
        document.body.append(div);
        setTimeout(() => (div.querySelector(".dialogContainer") as HTMLDivElement).style.opacity = "1", 25);
      }}>Export playlist {state.hasFetchingEnded ? "" : "[INCOMPLETE]"}</button>
      <br></br><br></br>
      <table>
        <tbody>
          <tr>
            <th>Export</th>
            <th>Video title:</th>
            <th>Channel name:</th>
            <th>Description:</th>
            <th>Thumbnail:</th>
          </tr>
          {state.playlistItems.map((item, index) => <tr ref={(el) => tableArr.current[index] = el} key={`PlaylistExporter-TableRowItem-${item.contentDetails.videoId}-${index}`}>
            <td><input type="checkbox" defaultChecked={!item.__avoidExporting} onChange={(e) => {
              playlistVideoArr.current[index].__avoidExporting = !e.target.checked; // Remember if the item should not be exported. This value is stored as the opposite of the checkbox, so that, even if it's undefined, it'll be considered in the exportation script before
              if (isShiftPressed.current && clickedTableNumber.current !== -1) {
                const newCheckValue = (tableArr.current[clickedTableNumber.current]?.querySelector("input[type=checkbox]") as HTMLInputElement | null)?.checked ?? false; // If the first element has been checked, check all the others. Otherwise, uncheck them.
                for (let i = Math.min(clickedTableNumber.current, index); i < Math.max(clickedTableNumber.current, index); i++) {
                  const checkbox = tableArr.current[i]?.querySelector("input[type=checkbox]") as HTMLInputElement | null;
                  if (checkbox) {
                    checkbox.checked = newCheckValue;
                    playlistVideoArr.current[i].__avoidExporting = !newCheckValue;
                  }
                }
              }
              clickedTableNumber.current = index; // Set that the last checkbox clicked is this one
              document.querySelector(".selectedCheckboxWrapper")?.classList?.remove("selectedCheckboxWrapper"); // And update the class that underlines the selected checkbox
              e.target.classList.add("selectedCheckboxWrapper");
            }}></input></td>
            <td><a href={`https://www.youtube.com/watch?v=${item.contentDetails.videoId}`} target="_blank">{item.snippet.title} [{item.contentDetails.videoId}]</a></td>
            <td>{item.snippet.videoOwnerChannelTitle}</td>
            <td style={{ whiteSpace: "pre-wrap" }} className={"hover"} onClick={() => {
              const div = document.createElement("div");
              const root = createRoot(div);
              root.render(<Dialog>
                <h2>{item.snippet.title}:</h2>
                <img srcSet={Object.values(item.snippet.thumbnails).map(thumbnail => `${thumbnail.url} ${thumbnail.width}w`).join(",")} style={{ width: "100%", borderRadius: "8px" }}></img><br></br><br></br>
                <Card type={1}>
                  <h3>Description:</h3>
                  <p style={{ whiteSpace: "pre-line" }}>{item.snippet.description}</p><br></br><br></br>
                </Card><br></br>
                <button onClick={() => {
                  (div.querySelector(".dialogContainer") as HTMLDivElement).style.opacity = "0";
                  setTimeout(() => root.unmount(), 210);
                }}>Close dialog</button>
              </Dialog>)
              document.body.append(div);
              setTimeout(() => (div.querySelector(".dialogContainer") as HTMLDivElement).style.opacity = "1", 25);
            }}>{item.snippet.description.substring(0, 100)}{item.snippet.description.length > 100 ? "..." : ""}</td>
            <td><img style={{ maxWidth: "72px", maxHeight: "72px" }} src={item.snippet.thumbnails.default.url} loading="lazy"></img></td>
          </tr>)}
        </tbody>
      </table><br></br><br></br>
      <p role="button" className="hover" style={{ textDecoration: "underline" }} onClick={() => updateState(prevState => { return { ...prevState, playlist: undefined, playlistItems: [], hasFetchingEnded: false } })}>Go back</p>
    </Card>}
  </>
}