/**
 * Convert MyTeX MCQ to iTest MCQ
 * @return {html}
 */
const convert = (laTeX) => {
	let lines = new String(laTeX).replace(/^\s*\n/gm, "").split(/\r\n|\r|\n/g);

	for (let i = 0; i < lines.length; i++) {
		lines[i] = lines[i].replace(/%.*$/g, "").replace(/\s\s*/g, " ").trim();
	}

	const questionIndexes = getQuestionIndexes(lines);
	const outputQuestions = [];

	for (let i = 0; i < questionIndexes.length; i++) {
		const [beginIndex, endIndex] = questionIndexes[i];
		const questionLines = lines.slice(beginIndex + 1, endIndex);
		const outputQuestion = getOutputQuestion(questionLines);
		outputQuestions.push(outputQuestion);
	}

    return getOutputQuestionsHTML(outputQuestions);
}

/**
 * getQuestionIndexes
 * @param {Array} lines 
 * @return {Array}
 */
const getQuestionIndexes = (lines) => {
	if (Array.isArray(lines)) {
		let fromIndex = -1;
		let questionsIndexes = [];

		while(true) {
			let beginIndex = -1;
			let endIndex = -1;
			const length = lines.length;

			for (let i = fromIndex + 1; i < length; i++) {
				if (lines[i] === '\\begin{ex}') {
					beginIndex = i;
					break;
				}
			}
			if (beginIndex === -1 || beginIndex === length - 1) {
				break;
			}

			for (let i = beginIndex + 1; i < length; i++) {
				if (lines[i] === '\\end{ex}') {
					endIndex = i;
					break;
				}
			}
			if (endIndex === -1) {
				break;
			}

			fromIndex = endIndex;
			questionsIndexes.push([beginIndex, endIndex]);
		}

		return questionsIndexes;
	}
	else {
		return [];
	}
}

/**
 * getOutputQuestion
 * @param {Array} lines 
 * @return {Object}
 */
const getOutputQuestion = (lines) => {
	let beginSolutionIndex = -1;
	let endQuestionIndex = lines.length - 1;
	let solution = null;

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].indexOf('\\loigiai') === 0) {
			beginSolutionIndex = i;
			break;
		};
	}

	if (beginSolutionIndex >= 0) {
		endQuestionIndex = beginSolutionIndex - 1;
		const solutionLines = lines.slice(beginSolutionIndex);
		solution = getSolution(solutionLines);
	}

	const questionLines = lines.slice(0, endQuestionIndex + 1);
	const question = getQuestion(questionLines);
	
	return {
		...question,
		solution,
	}
}

/**
 * getSolution
 * @param {Array} lines 
 * @return {String} 
 */
const getSolution = (lines) => {
	let solution = "";
	let beginIndex = lines[0] === '\\loigiai' ? 2 : 1;
	for (let i = beginIndex; i < lines.length; i++) {
		if (lines[i] !== "}") {
			solution += lines[i] + '<br/>';
		} else {
			break;
		}
	}
	solution = format(solution);
	return solution;
}

/**
 * getQuestion
 * @param {Array} lines 
 * @return {Object}
 */
const getQuestion = (lines) => {
	let questionContent;
	let figure = null;
	let choices;

	let beginQuestionContentIdx = -1;
	let endQuestionContentIdx = -1;
	let beginFigureIdx = -1;
	let endFigureIdx = -1;

	if (lines[0].indexOf('\\immini') === 0 || lines[0].indexOf('\\impicinpar') === 0) {
		if (lines[1] === '{') {
			beginQuestionContentIdx = 2;
		} else {
			beginQuestionContentIdx = 1;
		}

		for (let i = 0; i < lines.length; i++) {
			if (lines[i] === '}{') {
				endQuestionContentIdx = i;
				beginFigureIdx = i + 1;
				break;
			} else if (lines[i] === '}') {
				endQuestionContentIdx = i;
				beginFigureIdx = i + 2;
				break;
			}
		}

		for (let i = endQuestionContentIdx + 1; i < lines.length; i++) {
			if (lines[i] === '}') {
				endFigureIdx = i;
				break;
			}
		}

		for (let i = endFigureIdx + 1; i < lines.length; i++) {
			if (lines[i].indexOf('\\choice') === 0) {
				const questionContentLines = lines.slice(beginQuestionContentIdx, endQuestionContentIdx);
				const figureLines = lines.slice(beginFigureIdx, endFigureIdx);
				const choicesLines = lines.slice(i);
				questionContent = getQuestionContent(questionContentLines);
				figure = getFigure(figureLines);
				choices = getChoices(choicesLines);
				break;
			}
		}

		for (let i = 1; i < endQuestionContentIdx; i++) {
			if (lines[i].indexOf('\\choice') === 0) {
				const questionContentLines = lines.slice(beginQuestionContentIdx, i);
				const figureLines = lines.slice(beginFigureIdx, endFigureIdx);
				const choicesLines = lines.slice(i, endQuestionContentIdx);
				questionContent = getQuestionContent(questionContentLines);
				figure = getFigure(figureLines);
				choices = getChoices(choicesLines);
				break;
			}
		}
	} else {
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].indexOf('\\choice') === 0) {
				endQuestionContentIdx = i;
				const questionContentLines = lines.slice(0, endQuestionContentIdx);
				const choicesLines = lines.slice(endQuestionContentIdx);
				questionContent = getQuestionContent(questionContentLines);
				choices = getChoices(choicesLines);
			}
		}
	}

	return {
		questionContent,
		choices,
		figure,
	}
}

/**
 * getQuestionContent
 * @param {Array} lines 
 * @return {String}
 */
const getQuestionContent = (lines) => {
	let questionContent = "";

	for (let i = 0; i < lines.length; i++) {
		questionContent += lines[i];
		if (i !== lines.length - 1) {
			questionContent += '<br/>';
		}
	}

	questionContent = format(questionContent);

	return questionContent;
}

/**
 * getChoices
 * @param {Array} lines 
 * @return {Object}
 */
const getChoices = (lines) => {
	// Concate all choices
	let choicesInALines = "";

	for (let i = 0; i < lines.length; i++) {
		choicesInALines += lines[i];
	}
	
	// Check if choices is fixed
	let startChoicesIdx;
	let isChoicesFixed = false;

	if (choicesInALines.indexOf('\\choicefix') === 0) {
		startChoicesIdx = '\\choicefix'.length;
		isChoicesFixed = true;
	} else {
		startChoicesIdx = '\\choice'.length;
	}

	// Parse choices
	const stack = [];
	const choices = [];
	let currentChoice = "";

	for (let i = startChoicesIdx; i < choicesInALines.length; i++) {
		if (choices.length === 4) break;
		if (choicesInALines.charAt(i) === '{') {
			if (stack.length === 0) {
				if (i > startChoicesIdx) {
					choices.push(currentChoice);
					currentChoice = "";
				}
			} else {
				currentChoice += '{';
			}
			stack.push('{');
		} else if (choicesInALines.charAt(i) === '}') {
			if (i === choicesInALines.length - 1) {
				choices.push(currentChoice);
			}
			if (stack.length > 1) {
				currentChoice += '}';
			}
			stack.pop();
		} else {
			currentChoice += choicesInALines.charAt(i);
		}
	}

	// Return choices with position
	let correctChoice, mixChoice1, mixChoice2, mixChoice3;
	let correctAnswerIdx = 0;

	for (let i = 0; i < choices.length; i++) {
		choices[i] = choices[i].replace(/^\s*{\s*/,"").replace(/\s*}$/,"").trim();
		choices[i] = format(choices[i]);
		if (choices[i].indexOf('\\True') === 0) {
			correctAnswerIdx = i;
		}
	}

	choices[correctAnswerIdx] = choices[correctAnswerIdx].replace(/^\\True\s*/g, "");

	if (isChoicesFixed) {
		const alternatives = ['A', 'B', 'C', 'D'];

		correctChoice = alternatives[correctAnswerIdx];
		mixChoice1 = '';
		mixChoice2 = '';
		mixChoice3 = '';
	} else {
		const tmp = choices[correctAnswerIdx];
		choices[correctAnswerIdx] = choices[0];
		choices[0] = tmp;

		correctChoice = choices[0];
		mixChoice1 = choices[1];
		mixChoice2 = choices[2] || '-';
		mixChoice3 = choices[3] || '-';
	}

	return {
		correctChoice,
		mixChoice1,
		mixChoice2,
		mixChoice3,
		isChoicesFixed,
		fixedChoices: isChoicesFixed && choices,
	};
}

/**
 * getFigure
 * @param {Array} lines 
 * @return {String}
 */
const getFigure = (lines) => {
	let figure = "";
	for (let i = 0; i < lines.length; i++) {
		figure += lines[i];
		if (i !== lines.length - 1) {
			figure += '<br/>';
		}
	}
	figure = format(figure);
	return figure;
}

/**
 * getOutputQuestionsHTML
 * @param {Array} outputQuestions 
 * @return {html}
 */
 const getOutputQuestionsHTML = (outputQuestions) => {
    let html = "";
	const alternatives = ['(A)', '(B)', '(C)', '(D)'];

	for (let i = 0; i < outputQuestions.length; i++) {
		const question = outputQuestions[i];

        if (i > 0) {
		    html += "<br>";
        }

		html += "<table border=1 cellspacing=0 cellpadding=2>";
		
		if (question.figure) {
			html += "<tr>";
			html += "<td>H</td>";
			html += "<td class='pd_4px'>";
			html += "<table border=1 cellspacing=0 cellpadding=2>";
			html += "<tr>";
			if (question.choices.isChoicesFixed) {
				html += "<td>";
				html += question.questionContent;
				html += "<br/>";
				for (let i = 0; i < question.choices.fixedChoices.length; i++) {
					html += alternatives[i] + ' ' + question.choices.fixedChoices[i] + '<br/>';
				}
				html += "</td>";
			} else {
				html += "<td>" + question.questionContent + "</td>";
			}
			html += "<td>" + question.figure + "</td>";
			html += "</tr>";
			html += "</table>";
			html += "</td>";
			html += "</tr>";
		} else {
			html += "<tr>";
			html += "<td>H</td>";
			if (question.choices.isChoicesFixed) {
				html += "<td>";
				html += question.questionContent;
				html += "<br/>";
				for (let i = 0; i < question.choices.fixedChoices.length; i++) {
					html += alternatives[i] + ' ' + question.choices.fixedChoices[i] + '<br/>';
				}
				html += "</td>";
			} else {
				html += "<td>" + question.questionContent + "</td>";
			}
			html += "</tr>";
		}

		html += "<tr>";
		html += "<td>Đ</td>";
		html += "<td>" + question.choices.correctChoice + "</td>";
		html += "</tr>";

		html += "<tr>";
		html += "<td>T1</td>";
		html += "<td>" + question.choices.mixChoice1 + "</td>";
		html += "</tr>";

		html += "<tr>";
		html += "<td>T2</td>";
		html += "<td>" + question.choices.mixChoice2 + "</td>";
		html += "</tr>";

		html += "<tr>";
		html += "<td>T3</td>";
		html += "<td>" + question.choices.mixChoice3 + "</td>";
		html += "</tr>";

		html += "<tr>";
		html += "<td>K</td>";
		html += "<td>2</td>";
		html += "</tr>";

		html += "<tr>";
		html += "<td>M</td>";
		html += "<td>1</td>";
		html += "</tr>";

		if (question.solution) {
			html += "<tr>";
			html += "<td>G</td>";
			html += "<td>" + question.solution + "</td>";
			html += "</tr>";
		}
		
		html += "</table>";
	}
	return html;
} 

/**
 * Convert $...$ to \(...\)
 * @param {String} laTeX 
 * @return {String}
 */
 function convertMathDelimiter(laTeX) {
	let beginIndex = -1;
	let endIndex = -1;

	while(true) {
		beginIndex = laTeX.indexOf("$");
		if (beginIndex < 0 || beginIndex === laTeX.length - 1) break;
		endIndex = laTeX.indexOf("$", beginIndex + 1);
		if (endIndex < 0) break;
		laTeX = laTeX.substring(0, beginIndex) + "\\(" + laTeX.substring(beginIndex + 1, endIndex) + "\\)" + laTeX.substring(endIndex + 1);
	}

	return laTeX;
}

/**
 * Convert LaTeX command to html tag
 * @param {String} laTeX 
 * @return {String}
 */
const laTeX2html = (laTeX) => {
    laTeX = laTeX.replace(/\\textbf{([^}]*)}/g, "<b>$1</b>");
	laTeX = laTeX.replace(/\\textit{([^}]*)}/g, "<i>$1</i>");
	laTeX = laTeX.replace(/\\underline{([^}]*)}/g, "<u>$1</u>");
    laTeX = laTeX.replace(/\\begin{center}/g, "<center>");
    laTeX = laTeX.replace(/\\end{center}/g, "</center>");
	laTeX = laTeX.replace(/\\begin{enumerate}\s*\\item/g, "<ul><li>");
	laTeX = laTeX.replace(/\\begin{enumerate}\s*/g, "<ul>");
	laTeX = laTeX.replace(/\\item/g, "</li><li>");
	laTeX = laTeX.replace(/\\end{enumerate}/g, "</li></ul>");
	laTeX = laTeX.replace(/\\\\/g, "<br>");

    return laTeX;
}

/**
 * Format LaTeX
 * @param {String} laTeX 
 * @return {html}
 */
const format = (laTeX) => {
	let html = new String(laTeX);

    html = convertMathDelimiter(html);
    html = laTeX2html(html);

    return html;
}

/**
 * convertWithLoaderAndScroll
 */
const convertWithLoaderAndScroll = (html) => {
	const outputHeader = document.querySelector("p.output_header");
	const outputContainer = document.querySelector("div.output_container");
	const outputLoader = document.querySelector("div.output_loader");
	const output = document.querySelector("div.output");

	// Scroll to output after converting
	outputHeader.scrollIntoView({
		behavior: "smooth",
	});

	// Open loading overlay
	outputLoader.style.display = "block";
	outputContainer.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
	setTimeout(() => {
		outputLoader.style.display = "none";
		outputContainer.style.backgroundColor = "transparent";
		output.innerHTML = html;
	}, 1000);
}

/**
 * Handle click clear button
 */
document.querySelector("button.btn_clear").onclick = () => {
	document.querySelector("textarea.input").value = "";
	document.querySelector("div.output").innerHTML = "";
};

/**
 * Handle click convert button
 */
document.querySelector("button.btn_convert").onclick = () => {
	let html = convert(document.querySelector("textarea.input").value);
	convertWithLoaderAndScroll(html);
};

/**
 * Handle click convert file button
 */
document.querySelector("button.btn_convert_file").onclick = () => {
	const file = document.getElementById("input_file").files[0];
	const reader = new FileReader();

	reader.addEventListener("load", () => {
		let html = convert(reader.result);
		convertWithLoaderAndScroll(html);
	});

	if (file) {
		reader.readAsText(file);
	}
}

/**
 * Handle click export to msword button
 */
document.querySelector("button.btn_export").onclick = () => {
    const output = document.querySelector('div.output').innerHTML;
    if (!output) {
		return;
	}

    const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
    const postHtml = "</body></html>";
    html = preHtml + output + postHtml;

    const blob = new Blob(['\ufeff', html], {
        type: 'application/msword'
    });
    
    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    const filename = 'questions.doc';
    const downloadLink = document.createElement("a");

    document.body.appendChild(downloadLink);
    
    if (navigator.msSaveOrOpenBlob) {
        navigator.msSaveOrOpenBlob(blob, filename);
    } else {
        downloadLink.href = url;
        
        downloadLink.download = filename;
        
        downloadLink.click();
    }
    
    document.body.removeChild(downloadLink);
}