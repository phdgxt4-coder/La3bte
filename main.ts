import { Game } from "./Game";
new Game().start(document.getElementById("c") as HTMLCanvasElement).catch(e => { console.error(e); document.body.insertAdjacentText("beforeend", "Failed to start: " + e); });
