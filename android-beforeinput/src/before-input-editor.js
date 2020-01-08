import React, {useEffect, useRef} from "react";
import documents from "./Documents";
import { processSelect, getRangeFromDOMRange } from "./before-input-editor-helper";

export default function BeforeEditor(props = {
	initialValue: documents[0].dom,
	commandStream: () => {}
}) {
	const {commandStream} = props;
	const editable = useRef(null);
	
	useEffect(() => {
		let compositionState = null;
		
		const pushCommand = (commands) => {
			if (compositionState === null) {
				commandStream(commands);
			} else {
				compositionState.commands.push(...commands);
			}
		}
		
		const flushComposition = () => {
			commandStream(compositionState.commands)
			compositionState = null;
		}
		
		const startComposition = () => {
			compositionState = {
				commands: compositionState ? compositionState.commands : []
			};
		}
		
		editable.current.addEventListener('beforeinput', event => {
			console.log('BeforeEditor:beforeinput', event.inputType, 'data:', event.data, event.getTargetRanges())
			switch(event.inputType) {
				case 'insertText': {
					const [range] = event.getTargetRanges();
					pushCommand([{type: 'insertTextAtRange', text: event.data, range: getRangeFromDOMRange(range)}]);
					break;
				}
				case 'deleteByDrag':
				case 'deleteByCut':
				case 'deleteContentBackward': {
					const ranges = event.getTargetRanges();
					pushCommand(ranges.map(range => ({type: 'deleteAtRange', range: getRangeFromDOMRange(range)})));
					break;
				}
				case 'insertCompositionText': {
					const ranges = event.getTargetRanges();
					const selection = window.getSelection();
					const range = ranges[0] || selection.getRangeAt(0);
					pushCommand([{type: 'insertTextAtRange', text: event.data, range: getRangeFromDOMRange(range)}]);
					break;
				}
				case 'insertFromDrop':
				case 'insertFromPaste':
				case 'insertReplacementText': {
					const [range] = event.getTargetRanges();
					const text = event.data || event.dataTransfer.getData('text/plain');
					pushCommand([{type: 'insertTextAtRange', text, range: getRangeFromDOMRange(range)}]);
					break;
				}
				case 'insertLineBreak':
				case 'insertParagraph': {
					pushCommand([{type: 'splitBlock'}]);
					break;
				}
			}
		})
		
		editable.current.addEventListener('compositionend', event => {
			console.log('BeforeEditor:compositionend')
			flushComposition();
		})
		
		editable.current.addEventListener('compositionupdate', event => {
			console.log('BeforeEditor:compositionupdate')
		})
		
		editable.current.addEventListener('compositionstart', event => {
			startComposition();
			console.log('BeforeEditor:compositionstart', compositionState)
		})

		editable.current.ownerDocument.addEventListener('selectionchange', (event) => {
			if (event.currentTarget.activeElement === editable.current) {
				console.log('BeforeEditor:selectionchange', event)
				const [selection] = processSelect(event)
				
				if (selection) {
					if (compositionState === null || compositionState.commands.length === 0) {
						commandStream([selection]);
					} else {
						pushCommand([selection]);
					}
				}
			}
		});

		return () => {
		}
	});

	return (
		<div
			data-slate-editor="true"
			data-key={props.keyStart}
			ref={e => {editable.current = e;}}
			contentEditable="true" suppressContentEditableWarning
			className="line-ajust"
			autoCorrect="on"
			spellCheck="false"
			role="textbox"
			data-gramm="false"
			style={{
				outline: 'none',
				whiteSpace: 'pre-wrap',
				overflowWrap: 'break-word'
			}}
		>
			{props.initialValue}
		</div>
	);
}
