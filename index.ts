/// <reference lib="ESNEXT" />
import { DOMParser, HTMLDocument, Element } from "https://deno.land/x/deno_dom@v0.1.12-alpha/deno-dom-wasm.ts"
import 'https://cdn.jsdelivr.net/npm/json2csv@5.0.6/dist/json2csv.umd.js';
declare const json2csv: any

const pageList: HTMLDocument[] = []
const blogList: { href: string, text: string }[] = []
const gameList: { name: string, href: string, [key: string]: string }[] = []
const baseUrl = 'https://bangumi.tv'
fetch('https://bangumi.tv/user/240852/blog').then(response => response.text()).then(text => {
  const doc = new DOMParser().parseFromString(text, 'text/html')
  const pageAmount = Number(doc?.querySelector('.p_edge')?.innerHTML.match(/\(&nbsp;1&nbsp;\/&nbsp;(?<amount>\d+)&nbsp;\)/)?.groups?.amount)
  if (!pageAmount) {
    throw Error('Page 0')
  }
  return Promise.all(
    Array(pageAmount).fill(1).map((_, i) => fetch(`https://bangumi.tv/user/240852/blog?page=${i + 1}`)
      .then(response => response.text()).then(text => {
        pageList.push(new DOMParser().parseFromString(text, 'text/html') as HTMLDocument)
        console.log(`已读取 ${pageList.length}/${pageAmount} 页`)
      }))
  )
}).then(() => {
  const blogHrefList: string[] = []
  pageList.forEach(doc => {
    [...doc.querySelectorAll('.title a')].forEach(a => {
      blogHrefList.push(baseUrl + (<Element>a).getAttribute('href'))
    })
  })
  const allPromise = []
  const fetchHref = (href: string) => fetch(href)
    .then(response => response.text())
    .then(text => {
      if (text.length < 10000) {
        allPromise.push(fetchHref(href))
        return
      }
      blogList.push({ href, text })
      console.log(`已读取 ${blogList.length}/${blogHrefList.length} 篇博客`)
    })
 allPromise.push(...blogHrefList.map(href => fetchHref(href)))
  return Promise.all(allPromise)
}).then(() => {
  blogList.forEach(({ text , href}) => {
    const game: { name: string, href: string, [key: string]: string } = { 
      name: text.match(/《([^》]*)》/g)?.[1] || href,
      href,
    }
    const allMatch = text.matchAll(/【(?<type>[^】]*)】(?<score>[a-zA-Z]([-+]?)|(\d+))/g)
    for (let { groups } of allMatch) {
      if (groups) {
        game[groups.type] = groups.score
      }
    }
    gameList.push(game)
  })
  Deno.writeTextFileSync('./bangumi.csv', json2csv.parse(gameList))
}).catch(e => {
  console.error(e)
})


