class RoomContainer {
    constructor(room, color){
        this.room = room
        this.color = color
        this.startDate = new Date()
        this.endDate = new Date(new Date(this.startDate).setMonth(this.startDate.getMonth() + 2))
        this.element = this.#createElement(room, color)
        this.events = []
        this.reservationCount = 0
    }

    #createElement(room, color) {
        const startDateStr = this.startDate.toISOString().split('T')[0]
        const endDateStr = this.endDate.toISOString().split('T')[0]

        const roomElement = document.createElement('div')
        roomElement.classList.add('EeRoomContainer')
        roomElement.innerHTML = `
            <div class='EeRoomHeader'>
                <h1 style='text-decoration: underline; text-decoration-color: ${color}; text-decoration-thickness: 3px;'>
                    ${room}
                </h1>
                <div class='EeRoomHeaderDate'>
                    <div>
                        <input type='date' value='${startDateStr}' disabled>
                    </div>
                    <div>-</div>
                    <div>
                        <input type='date' value='${endDateStr}' class='endDateInput'/>
                    </div>
                    <div class='reservationCount'>
                        jakson varaus määrä..
                    </div>
                </div>
            </div>

            <div class='${room}'>
            </div>
        `

        const endDateInput = roomElement.querySelector('.endDateInput')
        endDateInput.addEventListener('input', (event) => {
            const newEndDate = new Date(event.target.value)
            if(newEndDate - this.startDate >= 0) {
                this.endDate = newEndDate
                this.renderEvents()
                endDateInput.style = 'outline: none;'
            } else {
                endDateInput.style = 'outline: 1px solid red;'
            }
        })

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
                <div class='EeParagraph'>${dateText.replaceAll('-', '.')}</div>
                <div class='EeParagraph'>${startTime}-${endTime}</div>
            </div>
    
            <div class='EeHeader'>${event.title}</div>
            <div class='EeParagraph'>${event.varaaja.split('::')[0]}</div>
            <div class='EeParagraph'>${event.room}</div>
        `
        return eventElement
    }

    renderEvents() {
        this.reservationCount = 0
        const roomContainer = this.element.querySelector('.'+this.room)
        roomContainer.innerHTML = ''
        const oneDayMs = 1000*60*60*20 //20hours
        this.events.forEach((event) => {
            // filter dates by endDate + 20hours
            if(new Date(event.end) - this.endDate >= oneDayMs){
                return
            } 
            roomContainer.appendChild(this.#eventElement(event))
            this.reservationCount++;
        })

        this.element.querySelector('.reservationCount').innerHTML = `jakson varaus määrä: ${this.reservationCount}`
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
            reservations = null
        }
    })

    if(!reservations) {
        console.log('database connection error...')
        return
    }

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


document.addEventListener('DOMContentLoaded', async () => {
    const calendarListElement = document.getElementById(php_args.element_name)
    if(!calendarListElement) return

    console.log('Tilavaraus lista loaded.')
    
    const link = document.createElement('a')
    link.href = php_args.link_to_main
    link.textContent = 'Tilavaraus kalenteri'
    calendarListElement.appendChild(link)

    await EventList(calendarListElement)

    const blink = document.createElement('a')
    blink.href = php_args.link_to_main
    blink.textContent = 'Tilavaraus kalenteri'
    calendarListElement.appendChild(blink)
})