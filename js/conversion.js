/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import type { Node, View } from '@nextcloud/files'

import { Permission, FileAction } from '@nextcloud/files'
import { translate as t } from '@nextcloud/l10n'

import logger from '../logger.ts'

export const ACTION_CONVERT = 'convert'

export const action = new FileAction({
	id: ACTION_CONVERT,
	displayName: () => t('video_converter', 'Convert into'),
	iconClass: 'icon-convert',
	mime: 'video',
	permissions: Permission.UPDATE,
	type: 'dropdown',

	enabled: (nodes: Node[]) => {
		return nodes.length === 1 && nodes[0].permissions !== Permission.NONE;
	},

	async exec(node: Node, view: View, dir: string) {
		const filename = node.name; // Assuming node has a 'name' property for the filename
		let preset = "medium";
		let priority = "0";
		let vcodec = null;
		let acodec = null;
		let vbitrate = null;
		let scaling = null;
		let faststart = true;

		const createDialog = () => {
			return `
				<div id="linkeditor_overlay" class="oc-dialog-dim"></div>
				<div id="linkeditor_container" class="oc-dialog" style="position: fixed;">
					<div id="linkeditor">
						<div class="urledit push-bottom">
							<a class="oc-dialog-close" id="btnClose"></a>
							<h2 class="oc-dialog-title" style="display:flex;margin-right:30px;">
								<span>Convert into</span> ${filename}
							</h2>
							<div class="sk-circle" style="display:none" id="loading">
								${[...Array(12).keys()].map(i => `<div class="sk-circle${i + 1} sk-child"></div>`).join('')}
							</div>
							<div style="text-align:center; display:none; margin-top: 10px;" id="noteLoading">
								<p>Note: This could take a considerable amount of time depending on your hardware and the preset you chose. You can safely close this window.</p>
							</div>
							<div id="params">
								${generateParamHtml()}
							</div>
							<p class="vc-label urldisplay" id="text" style="display: inline; margin-right: 10px;">
								${t('video_converter', 'Choose the output format:')} <em></em>
							</p>
							<div class="oc-dialog-buttonrow boutons" id="buttons">
								<a class="button primary" id="mp4">${t('video_converter', '.MP4')}</a>
								<a class="button primary" id="avi">${t('video_converter', '.AVI')}</a>
								<a class="button primary" id="m4v">${t('video_converter', '.M4V')}</a>
								<a class="button primary" id="webm">${t('video_converter', '.WEBM')}</a>
							</div>
						</div>
					</div>
				</div>
			`;
		};

		const generateParamHtml = () => {
			return `
				<p class="vc-label urldisplay" id="labelPreset" style="display:inline-block; margin-right:5px;">Preset</p>
				<select id="preset">
					<option value="ultrafast">UltraFast</option>
					<option value="superfast">SuperFast</option>
					<option value="veryfast">VeryFast</option>
					<option value="faster">Faster</option>
					<option value="fast">Fast</option>
					<option value="medium" selected>Medium (default)</option>
					<option value="slow">Slow</option>
					<option value="slower">Slower</option>
					<option value="veryslow">VerySlow</option>
				</select>
				<br>
				<p id="note">Note: faster means worse quality or bigger size</p>
				<br>
				<p class="vc-label urldisplay" id="labelPriority" style="display:inline-block; margin-right:5px;">Priority</p>
				<select id="priority" style="margin-bottom: 10px;">
					<option value="-10">High</option>
					<option value="0">Normal (default)</option>
					<option value="10" selected>Low</option>
				</select>
				<br>
				<p class="vc-label urldisplay" id="labelCodecV" style="display:inline-block; margin-right:5px;">Codec</p>
				<select id="vcodec" style="margin-bottom: 10px;">
					<option value="none">Auto</option>
					<option value="x264">H264</option>
					<option value="x265">HEVC</option>
					<option value="copy">Copy</option>
				</select>
				<p class="vc-label urldisplay" id="labelBitrate" style="display:inline-block; margin-right:5px;">Target bitrate</p>
				<select id="vbitrate" style="margin-bottom: 10px;">
					<option value="none">Auto</option>
					<option value="1">1k</option>
					<option value="2">2k</option>
					<option value="3">3k</option>
					<option value="4">4k</option>
					<option value="5">5k</option>
					<option value="6">6k</option>
					<option value="7">7k</option>
				</select>
				<p class="vc-label urldisplay" id="labelBitrateUnit" style="display:inline-block; margin-right:5px;">kbit/s</p>
				<br>
				<p class="vc-label urldisplay" id="labelCodecA" style="display:inline-block; margin-right:5px;">Codec Audio</p>
				<select id="acodec" style="margin-bottom: 10px;">
					<option value="none">Auto</option>
					<option value="aac">AAC</option>
					<option value="an">No audio</option>
				</select>
				<br>
				<p class="vc-label urldisplay" id="labelScale" style="display:inline-block; margin-right:5px;">Scale to</p>
				<select id="scale" style="margin-bottom: 10px;">
					<option value="none">Keep</option>
					<option value="vga">VGA (640x480)</option>
					<option value="wxga">WXGA (1280x720)</option>
					<option value="hd">HD (1368x768)</option>
					<option value="fhd">FHD (1920x1080)</option>
					<option value="uhd">4K (3840x2160)</option>
					<option value="320">Keep aspect 320 (Wx320)</option>
					<option value="480">Keep aspect 480 (Wx480)</option>
					<option value="600">Keep aspect 600 (Wx600)</option>
					<option value="720">Keep aspect 720 (Wx720)</option>
					<option value="1080">Keep aspect 1080 (Wx1080)</option>
				</select>
				<br>
				<div class="checkbox-container">
					<label class="vc-label" for="movflags">Faststart option (for MP4)</label>
					<input type="checkbox" id="movflags" name="faststart" checked>
				</div>
			`;
		};

		document.body.insertAdjacentHTML('beforeend', createDialog());

		document.getElementById("btnClose").addEventListener("click", closeDialog);
		document.getElementById("preset").addEventListener("change", (e) => preset = e.target.value);
		document.getElementById("priority").addEventListener("change", (e) => priority = e.target.value);
		document.getElementById("vcodec").addEventListener("change", (e) => vcodec = e.target.value === "none" ? null : e.target.value);
		document.getElementById("acodec").addEventListener("change", (e) => acodec = e.target.value === "none" ? null : e.target.value);
		document.getElementById("vbitrate").addEventListener("change", (e) => vbitrate = e.target.value === "none" ? null : e.target.value);
		document.getElementById("scale").addEventListener("change", (e) => scaling = e.target.value === "none" ? null : e.target.value);
		document.getElementById("movflags").addEventListener("change", (e) => faststart = e.target.checked);
		document.getElementById("linkeditor_overlay").addEventListener("click", closeDialog);

		const fileExt = filename.split('.').pop();
		const types = ['avi', 'mp4', 'm4v', 'webm'];
		types.forEach(type => {
			document.getElementById(type).addEventListener("click", async () => {
				// Enable loading indicator
				document.getElementById("loading").style.display = "block";
				document.getElementById("text").style.display = "none";
				document.getElementById("noteLoading").style.display = "block";

				const response = await convertFile(node, type, preset, priority, vcodec, acodec, vbitrate, scaling, faststart);
				
				if (response.error) {
					// Handle error
					console.error("Conversion error:", response.error);
					alert("Error converting file: " + response.error);
				} else {
					// Refresh the file list or update UI as necessary
					window.OCP.Files.FileList.reload();
				}

				closeDialog();
			});
		});

		function closeDialog() {
			document.getElementById("linkeditor_overlay").remove();
			document.getElementById("linkeditor_container").remove();
		}
	},

	order: -50,
});

// Simulating an async conversion process
async function convertFile(node: Node, outputType: string, preset: string, priority: string, vcodec: string | null, acodec: string | null, vbitrate: string | null, scaling: string | null, faststart: boolean) {
	// Here, you would implement the actual conversion logic, possibly making an API call to your backend.
	console.log(`Converting ${node.name} to ${outputType} with preset ${preset}, priority ${priority}, vcodec ${vcodec}, acodec ${acodec}, vbitrate ${vbitrate}, scaling ${scaling}, faststart ${faststart}`);
	
	// Simulating conversion time
	return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 3000));
}
