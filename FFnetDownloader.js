// ==UserScript==
// @name        FFDownloader 
// @namespace   Violentmonkey Scripts
// @match       https://www.fanfiction.net/s/*
// @grant       none
// @version     1.0
// @author      SeanZ
// @description Download something on FFNet!
// @run-at      document-idle
// ==/UserScript==

const parser = new DOMParser()

function addDownloadButton() {
    const profileTop = document.querySelector('#profile_top')
    const followButton = document.querySelector("button.pull-right")

    const downloadButton = document.createElement('button')
    downloadButton.setAttribute('class', 'btn pull-right')
    downloadButton.setAttribute('type', 'button')
    downloadButton.id = 'downloadStoryButton'
    downloadButton.style = 'margin-left:5px'
    downloadButton.textContent = 'Download'
    downloadButton.onclick = (event) => {
        event.preventDefault()
        downloadWork()
    }

    profileTop.insertBefore(downloadButton, followButton)
}

function getTitleAndAuthor() {
    return {
        title: document.querySelector("b.xcontrast_txt").textContent,
        author: document.querySelector("a.xcontrast_txt[href^='/u/']").textContent
    }
}

async function downloadWork() {
    const {title, author} = getTitleAndAuthor()
    const downloadButton = document.getElementById('downloadStoryButton')
    const downloadFilename = `${author} - ${title}`
    console.log("kicked off download for " + downloadFilename)

    const doc = document.implementation.createHTMLDocument()
    doc.title = downloadFilename

    // get the chapter list, if possible
    let chapterList = getChapterList()

    if (!chapterList) {
        // single chapter work
        addChapterHeader(doc, title)

        console.log(doc.documentElement.innerHTML)

        // no fetch, single work
        doc.body.append(extractStoryFromDocument(document))
    }
    else {
        for (const [index, chapter] of chapterList.entries()) {
            console.log("Fetching chapter: " + chapter.title)
            downloadButton.textContent = `Downloading ${index}/${chapterList.length}`
            let chapterNode = await fetchChapter(chapter.url)

            addChapterHeader(doc, chapter.title)
            doc.body.append(chapterNode)
        }

        downloadButton.textContent = 'Download'
    }

    // the first chapter is special, because it's already loaded, so we don't need to fetch it.

    createDownloadPrompt(doc, downloadFilename + '.html')

}

async function fetchChapter(url) {
    let ch = await fetch(url)
    let chText = await ch.text()

    let tmpDoc = parser.parseFromString(chText, 'text/html')
    return extractStoryFromDocument(tmpDoc)
}

function extractStoryFromDocument(pageDocument) {
    const storyTextNode = pageDocument.querySelector('#storytext')
    const storyCopy = storyTextNode.cloneNode(true)
    storyCopy.removeAttribute('id')
    return storyCopy
}

function createDownloadPrompt(storyDocument, filename) {
    let blob = new Blob([storyDocument.documentElement.outerHTML], {type: 'text/html'})
    
    let downloadLink = document.createElement('a')
    downloadLink.href = URL.createObjectURL(blob)
    downloadLink.setAttribute('download', filename)

    document.body.appendChild(downloadLink)

    console.log('clicking download link')
    downloadLink.click()

    document.body.removeChild(downloadLink)
}

function getChapterList() {
    /** 
     * Fetch the chapter list and urls. 
     * If there is only one chapter, return null.
    */

    let chapterSelector = document.querySelector('#chap_select')
    if (chapterSelector === null) return null

    let storyURL = getBaseStoryUrl()

    let chapters = Array.from(chapterSelector.querySelectorAll('option'))
    return chapters.map(c => ({url: `${storyURL}/${c.value}`, title: c.text}))
}

function getBaseStoryUrl() {
    /**
     * Locate the base story url, without any chapter info or titles
     */
    let re = /.*\/s\/\d+/
    return window.location.toString().match(re)[0]
}

function addChapterHeader(doc, text) {
    let elem = doc.createElement('h1')
    elem.className = 'chapter' //this is so calibre will auto-detect chapters.
    elem.textContent = text
    doc.body.appendChild(elem)
}

addDownloadButton()

