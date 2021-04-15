// console.log('Globals Loaded')

function anotherGenName(imgFolder, isFull, imgNamePort, imgNameScreen, imgExt){
  let imgFullSizeDir = isFull ? 'prog_page_full' : 'prog_page'
  return {
    'imgPath': `../img/portfolio_page/${imgFolder}/${imgFullSizeDir}/`,
    isFull,
    imgNamePort,
    imgNameScreen,
    imgExt
  }; 
}

const resolutions = [ '420', '576', '768', '992', '1200', '2900', 'full', 'org' ]

function generateArrayOfObjectsBasedOnRes(){
  let params = Array.from(arguments)
  let arr = []
  for(let i = 0; i < params.length - 1; i += 1){
    arr.push(params[i] === true ? returnImgObj(resolutions[i], params[params.length - 1]) : null)
  }
  return arr
}

function returnImgObj(res, fileInfo){
  let obj = {}
  // const 
  let htmlElem = 'source'
  const srcset = ``
  if(res === resolutions[6]){
    // then its a different element type
    htmlElem = 'img'
  }
  else if(res === resolutions[7]){
    htmlElem = 'a'
  }
  obj[res] = {
    htmlElem: htmlElem,
    fileInfo
  }
  return obj
}

function generateResponsiveModalImageContent(h2Text, numberOfImages, imageInfoObj){
  let returnDiv = document.createElement('div')
  returnDiv.setAttribute('class', 'col-md-12')
    // everything inside
    let h2Elem = document.createElement('h2')
    h2Elem.setAttribute('class', 'centerH2')
    h2Elem.innerText = h2Text;
    returnDiv.appendChild(h2Elem)
    let hrThick = document.createElement('hr')
    hrThick.setAttribute('class', 'hrShowThick')
    returnDiv.appendChild(hrThick)
    let divh50 = document.createElement('div')
    divh50.setAttribute('class', 'h-50')
    returnDiv.appendChild(divh50)
    // build a number of anchor elements which contain responsive images
    for(let i = 1; i < numberOfImages + 1; i += 1){
      let anchorElement = document.createElement('a')
      // console.log(imageInfoObj)
      
      let num = i
      if(i < 10){
        num = `0${i}`
      }
      // const hrefPath = `${imageInfoObj['imgPath']}${imageInfoObj['imgName']}.${imageInfoObj['imgExt']}`
      const hrefPath = `${imageInfoObj['imgPath']}${imageInfoObj['imgNameScreen']}${num}.${imageInfoObj['imgExt']}`
      
      anchorElement.setAttribute('href', hrefPath)
      anchorElement.setAttribute('target', '_blank')
      
      // here i need to return a set of HTML elements.
      const resArrFullSize = generateArrayOfObjectsBasedOnRes(true, true, false, true, true, true, true, false, imageInfoObj);
      
      anchorElement.appendChild(generateResponsiveImageContent(resArrFullSize, num))
      
      returnDiv.appendChild(anchorElement)
    }
  return returnDiv;
}

function generateResponsiveImageContent(data, imgNum){
  // console.log('data: ', data)
  let elemPic = document.createElement('picture');
  // console.log(elemPic)
  // need to map through each size
  for(let i = 0; i < data.length; i += 1){
    // console.log(i, data[i])
    if(data[i]){
      // if there is an object, then generate html, if not, skip
      // loop obj (but only one key)
      for(let key in data[i]){
        const isFullImg = data[i][key]['fileInfo']['isFull']
        let imgPathAndName = ''
        if(isFullImg){
          // let num = i
          // if(i < 10){
          //   num = `0${i}`
          // }
          imgPathAndName = `${data[i][key]['fileInfo']['imgPath']}${data[i][key]['fileInfo']['imgNameScreen']}${imgNum}_${key}.${data[i][key]['fileInfo']['imgExt']}`
        } else {
          imgPathAndName = `${data[i][key]['fileInfo']['imgPath']}${data[i][key]['fileInfo']['imgNamePort']}_${key}.${data[i][key]['fileInfo']['imgExt']}`
          // console.log('port: ', imgPathAndName)
        }
        let childElem = ''
        if(data[i][key]['htmlElem'] === 'source'){
          // then make a source element
          childElem = document.createElement('source')
          childElem.setAttribute('srcset', imgPathAndName)
          childElem.setAttribute('media', `(max-width: ${key}px)`)
          childElem.setAttribute('type', `image/${data[i][key]['fileInfo']['imgExt']}`)
        }
        else if(data[i][key]['htmlElem'] === 'img'){
          // then make a img element
          childElem = document.createElement('img')
          childElem.setAttribute('src', imgPathAndName)
          childElem.setAttribute('alt', `image`)
          childElem.setAttribute('class', `img-responsive`)
          
        }
        else if(data[i][key]['htmlElem'] === 'a'){
          // then make anchor element
          childElem = document.createElement('a')
        }
        elemPic.appendChild(childElem)
      }
    }
  }
  return elemPic;
}