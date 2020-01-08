

function isEmptyNode(node) {
	return node.firstChild === null || (
		(
			node.firstChild.nodeName === 'BR' ||
			node.firstChild.nodeName === '#text'
		) && (
			node.textContent === '\n' ||
			node.textContent === ''
		)
	);
}

function nodeAccountsForPath(node) {
	return (
		node.nodeName !== '#text' && (
			node.dataset.slateObject === 'text' ||
			node.dataset.slateObject === 'inline' ||
			node.dataset.slateObject === 'block' ||
			node.dataset.slateEditor === 'true' || (
				node.nodeName !== '#text' &&
				isRootNode(node.parentNode)
			)
		)
	);
}

function isRootNode(node) {
	return node.dataset.slateEditor === 'true' || node.parentNode === null;
}

function getPathForNode(node) {
	let currentNode = node
	const path = []
	
	while (!isRootNode(currentNode)) {
		if (
			currentNode.dataset.slateObject === 'text' ||
			currentNode.dataset.slateObject === 'block' ||
			currentNode.dataset.slateObject === 'inline' ||
			currentNode.parentNode.dataset.slateEditor === 'true'
		) {
			const index = Array.from(currentNode.parentNode.childNodes).indexOf(currentNode);
			path.unshift(index)
		}

		currentNode = currentNode.parentNode
	}

	return path
}

function getPointForNode(currentNode, initialOffset = 0) {
	let offset = initialOffset;

	while (!nodeAccountsForPath(currentNode)) {
		while (currentNode.previousSibling !== null) {
			currentNode = currentNode.previousSibling;
			offset += currentNode.textContent.length;
		}

		currentNode = currentNode.parentNode;
	}

	const path = getPathForNode(currentNode);
	return {path, offset};
}

function domPointToFurthestNode(domNode, domOffset, prefer) {
	if (domNode.nodeName !== '#text') {
		while (domNode.childNodes.length !== 0) {
			if (prefer === 'right') {
				if (domOffset === domNode.childNodes.length) {
					domNode = domNode.lastChild;
					domOffset = 0;
				} else {
					domNode = domNode.childNodes[domOffset]
					domOffset = 0
				}
			} else if (prefer === 'left') {
				if (domOffset === 0) {
					domNode = domNode.firstChild;
					domOffset = isEmptyNode(domNode) ? 0 : domNode.childNodes.length || domNode.textContent.length;
				} else {
					domNode = domNode.childNodes[domOffset - 1]
					domOffset = domNode.childNodes.length || domNode.textContent.length
				}
			}
		}
	}
	
	if (domNode.nodeName === 'BR') {
		let previousNode = domNode.previousSibling;
		
		if (previousNode !== null) {
			domOffset = previousNode.textContent.length;
			domNode = previousNode;
		}
	}
	
	return [domNode, domOffset];
}

function rangeNodeAndOffset(domRange) {
	const nodeInEditor = (node) => {
		return (
			(node && node.dataset && node.dataset.slateEditor === 'true') ||
			node.parentNode.closest('[data-slate-editor]') !== null
		);
	};
	
	if (nodeInEditor(domRange.startContainer) && nodeInEditor(domRange.endContainer)) {
		const [startNode, startOffset] = domPointToFurthestNode(domRange.startContainer, domRange.startOffset, 'right');
		const [endNode, endOffset] = domPointToFurthestNode(domRange.endContainer, domRange.endOffset, 'left');
		
		return {
			anchor: {
				node: startNode,
				offset: startOffset,
			},
			focus: {
				node: endNode,
				offset: endOffset,
			},
		};
	}
	
	return null;
}

export function getRangeFromDOMRange(staticRange) {
	const nodeAndOffset = rangeNodeAndOffset(staticRange);
	
	if (nodeAndOffset !== null) {
		const anchor = getPointForNode(nodeAndOffset.anchor.node, nodeAndOffset.anchor.offset);
		const focus = getPointForNode(nodeAndOffset.focus.node, nodeAndOffset.focus.offset);
		return {anchor, focus};
	} else {
		return null;
	}
}

export function processSelect() {
	const domSelection = window.getSelection();
	const domRange = domSelection.getRangeAt(0);
	const range = getRangeFromDOMRange(domRange);
	
	if (range !== null) {
		const isForward = domSelection.anchorNode === domRange.startContainer;
		
		return [{
			type: "select",
			range: {
				anchor: isForward ? range.anchor : range.focus,
				focus: isForward ? range.focus : range.anchor,
			}
		}];
	}
	
	return [];
}
