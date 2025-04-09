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

class RoomContainer {
    constructor(room, color){
        this.room = room
        this.color = color
        this.element = this.#createElement(room, color)
        this.events = []
    }

    #createElement(room, color) {
        const roomElement = document.createElement('div')
        roomElement.innerHTML = `
            <h1 style='text-decoration: underline; text-decoration-color: ${color}; text-decoration-thickness: 3px;'>
                ${room}
            </h1>
            <div class='${room}'>
            </div>
        `
        return roomElement
    }

    // event {id: number, title, room, start, end, content, varaaja, color: string}
    // room / content can be null
    #eventElement(event) {
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

    renderEvents() {
        const roomContainer = this.element.querySelector('.'+this.room)
        roomContainer.innerHTML = ''
        this.events.forEach((event) => {
            roomContainer.appendChild(this.#eventElement(event))
        })
    }

    addEvent(event) {
        if(!event.room) return false

        this.events.push(event)
        return true
    }
}

async function EventList(parentElement){
    let reservations

    const container = document.createElement('div')
    container.innerHTML = `
        <div class='EeMainContainer'>
        </div>
    `
    const mainContainer = container.querySelector('.EeMainContainer')

    // create room container/element/object things
    const rooms = {} // {roomName: roomObject}
    for (const [room, color] of Object.entries(php_args.huoneet)){
        const roomObject = new RoomContainer(room, color)
        rooms[room] = roomObject
        mainContainer.appendChild(roomObject.element)
    }

    // fetch all events (within year) from database
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

    // add events for appropriate rooms
    for (const event of reservations) {
        if(!event.room) continue
        rooms[event.room].addEvent(event)
    }

    // render all rooms
    for (const room of Object.values(rooms)) {
        if(room instanceof RoomContainer){
            room.renderEvents()
        }
    }

    parentElement.appendChild(container)
}