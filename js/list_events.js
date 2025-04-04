function eventElement(event) {
    const eventElement = document.createElement('div')
    //eventElement.style = 'outline: 1px solid coral;'
    eventElement.classList.add('EeElement')
    let [dateText, startTime] = event.start.split(' ')
    let [ , endTime] = event.end.split(' ')

    startTime = startTime.split(':')
    startTime = startTime[0] + ':' + startTime[1]

    endTime = endTime.split(':')
    endTime = endTime[0] + ':' + endTime[1]

    eventElement.innerHTML = `
        <div class='EeDateTime'>
            <div class='EeParagraph'>${dateText}</div>
            <div class='EeParagraph'>${startTime}-${endTime}</div>
        </div>

        <div class='EeHeader'>${event.title}</div>
        <div class='EeParagraph'>${event.varaaja.split('::')[0]}</div>
        <div class='EeParagraph'>${event.room}</div>
    `
    return eventElement
}

async function EventList(parentElement){
    let reservations

    const container = document.createElement('div')
    container.innerHTML = `
        <div class='EeMainContainer'>
        </div>
    `
    const mainContainer = container.querySelector('.EeMainContainer')
    for (const [room, color] of Object.entries(php_args.huoneet)){
        const roomContainer = document.createElement('div')
        roomContainer.innerHTML = `
            <h1 style='text-decoration: underline; text-decoration-color: ${color}; text-decoration-thickness: 3px;'>
                ${room}
            </h1>
            <div class='${room}'>
            </div>
        `
        mainContainer.append(roomContainer)
    }

    await jQuery.ajax({
        type: "POST",
        dataType: "json",
        url: php_args.ajax_url,
        data: { action: 'huone_get_all' },
        success: function (response) {
            reservations = response.data.map(obj => {
                const color = php_args.huoneet[obj.room] ? php_args.huoneet[obj.room] : '#5baa00'
                return {...obj, color:color}
            })
        },
        error: function(error){
            console.log('get all error:', error)
        }
    })

    // filter old events
    reservations = reservations.filter(event => 
        new Date (event.end) - new Date() >= 0
    )

    // sort events by date
    reservations = reservations.sort((curr, next) => {
        return new Date(curr.start) - new Date(next.start)
    })

    for(const event of reservations){
        if(!event.room) continue
        const roomElement = mainContainer.querySelector('.'+event.room)
        if(!roomElement) continue
        roomElement.appendChild(eventElement(event))
    }

    /*
    for(const event of reservations){
        eventsContainer.appendChild(eventElement(event))
    }
    */

    parentElement.appendChild(container)
}