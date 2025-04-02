document.addEventListener('DOMContentLoaded', async () => {
    const calendarElement = document.getElementById(php_args.element_name)
    if(!calendarElement) return
    calendarElement.setAttribute('name', 'huone_kalenteri_css')
    console.log('huone kalenteri loaded.')

    let reservations

    await jQuery.ajax({
        type: "POST",
        dataType: "json",
        url: php_args.ajax_url,
        data: { action: 'huone_get_all' },
        success: function (response) {
            reservations = response.data.map(obj => {
                return {...obj, color:'#5baa00'}
            })
        },
        error: function(error){
            console.log('get all error:', error)
        }
    })


    const calendar = new FullCalendar.Calendar(calendarElement, {
        initialView: 'timeGridWeek',

        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },

        buttonText: {
            today: 'Tänään',
            month: 'Kuukausi',
            week: 'Viikko',
            day: 'Päivä'
        },

        navLinks: true, // can click day/week names to navigate views
        selectable: true,
        selectMirror: true,
        locale: 'fi-fi',
        allDaySlot: false,
        unselectAuto: false, // if true(default) event gets unselected during popup()

        slotMinTime: "07:00",
        slotMaxTime: "19:00",
        firstDay: 1,

        editable: true,
        dayMaxEvents: true,

        //events: testEvents,¨
        events: reservations,

        //weekends: false,

        select: async function(arg) {
            // 1 day has to be subtracted when in monthview and making reservations, else 2 day long event is created.
            const endDate = new Date(arg.end)
            if (calendar.view.type === 'dayGridMonth') { endDate.setDate(arg.end.getDate() - 1) }

            const result = await createPopup(arg.start, endDate)
            if(result){
                jQuery.ajax({
                    type: "POST",
                    dataType: "json",
                    url: php_args.ajax_url,
                    data: {
                        action: 'huone_post_db',
                        room: result.tila,
                        start: dateNoTimezone(result.alkuDate),
                        end: dateNoTimezone(result.loppuDate),
                        title: result.otsikko,
                        content: result.sisalto,
                        varaaja: result.varaaja,
                    },
                    success: function (response) {
                        calendar.addEvent({
                            id: response.data.id,
                            room: result.tila,
                            start: result.alkuDate,
                            end: result.loppuDate,
                            title: result.otsikko,
                            content: result.sisalto,
                            varaaja: result.varaaja,
                            color: '#5baa00'
                        })
                        console.log('added, id:', response.data.id)
                    },
                    error: function(error){
                        console.log('add error:', error)
                    }
                })
            }
            calendar.unselect()
        },

        eventClick: async function(arg) {
            const clickPopupReturn = await clickPopup(arg.event)

            if (!clickPopupReturn.id) {
                return
            }

            if (clickPopupReturn.delete){
                jQuery.ajax({
                    type: "post",
                    dataType: "json",
                    url: php_args.ajax_url,
                    data: {
                        action:'huone_delete_db',
                        id: clickPopupReturn.id
                    },
                    success: function(){ 
                        arg.event.remove()
                        console.log('deleted, id:', clickPopupReturn.id ); 
                    },
                    error: function(error){
                        console.log('deleted with error, id:', clickPopupReturn.id );
                        console.log('delete error:', error)
                    }
                })
            }
        },

        eventDrop: async function(arg){
            if(await moveDialog('siirrä varaus?')){
                jQuery.ajax({
                    type: "post",
                    dataType: "json",
                    url: php_args.ajax_url,
                    data: {
                        action:'huone_update_db',
                        id: arg.event.id,
                        start: dateNoTimezone(arg.event.start),
                        end: dateNoTimezone(arg.event.end)
                    },
                    success: function(){
                        console.log('moved, id:', arg.event.id); 
                        },
                    error: function(error){
                        console.log('moved with error, id:', arg.event.id)
                        console.log('move error:', error)
                    }
                })
            } else {
                arg.revert()
            }
        },

        eventResize: async function (arg) {
            if(await moveDialog('päivitä varaus?')){
                jQuery.ajax({
                    type: "post",
                    dataType: "json",
                    url: php_args.ajax_url,
                    data: {
                        action:'huone_update_db',
                        id: arg.event.id,
                        start: dateNoTimezone(arg.event.start),
                        end: dateNoTimezone(arg.event.end)
                    },
                    success: function(){
                        console.log('moved, id:', arg.event.id); 
                        },
                    error: function(error){
                        console.log('moved with error, id:', arg.event.id)
                        console.log('move error:', error)
                    }
                })
            } else {
                arg.revert()
            }
        },

        eventDidMount: function (event) {
            if (calendar.view.type === 'timeGridWeek' || calendar.view.type === 'timeGridDay') {
                const eventElement = event.el.querySelector('.fc-event-title-container')
                eventElement.innerHTML = ''
                
                const title = document.createElement('div')
                title.classList.add('huone-event-title')

                const hText = document.createElement('h3')
                hText.textContent = event.event._def.title
                hText.classList.add('hkBaseText')
                title.appendChild(hText)

                if (event.event._def.extendedProps.room) {
                    const pText = document.createElement('p')
                    pText.classList.add('hkMinorText')
                    pText.textContent = event.event._def.extendedProps.room
                    title.appendChild(pText)
                }

                eventElement.append(title)

                if (event.event._def.extendedProps.content) {
                    const content = document.createElement('div')
                    content.textContent = event.event._def.extendedProps.content
                    content.classList.add('huone-event-content')
                    //content.classList.add('fc-event-title')
                    //content.classList.add('fc-sticky')
                    eventElement.append(content)
                }

                if (event.event._def.extendedProps.varaaja) {
                    const varaaja = document.createElement('div')
                    varaaja.textContent = event.event._def.extendedProps.varaaja
                    varaaja.classList.add('huone-event-varaaja')
                    //varaaja.classList.add('fc-event-title')
                    //varaaja.classList.add('fc-sticky')
                    eventElement.append(varaaja)
                }
            }
        }
    })

    calendar.render()

    /*

    const seriesButton = document.createElement('button')
    seriesButton.innerHTML = 'Sarja varaus'
    seriesButton.classList.add('varausBaseButton', 'baseFCButton') //'baseFCButton'
    seriesButton.addEventListener('click', async () => {
        const threeHours = 1000 * 60 * 60 * 3
        const oneDay = 1000 * 60 * 60 * 24
        SeriesPopup(new Date(), new Date(Date.now() + threeHours + oneDay*7)).then(value => {
            console.log(value)
        })
    })
    calendarElement.appendChild(seriesButton)

    const threeHours = 1000 * 60 * 60 * 3
    const oneDay = 1000 * 60 * 60 * 24
     SeriesPopup(new Date(), new Date(Date.now() + threeHours + oneDay*7)).then(value => {
        console.log(value)
    })
    */
})


function dateNoTimezone(date) {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString();
}

function dateToHourMin(date) {
    const timeString = date.split("T")[1].split(".")[0].split(":")
    return timeString[0] + ':' + timeString[1]
}
  
function dateToJustDate(date) {
    const dateString = date.split("T")[0].split("-").reverse().join(".")
    return dateString
}


async function createPopup(startTime, endTime) {
    return new Promise((resolve) => {
        const [sHours, sMinutes] = dateNoTimezone(startTime).split("T")[1].split(".")[0].split(":")  // turn dateobj to string array [0]hours [1]minutes
        const [eHours, eMinutes] = dateNoTimezone(endTime).split("T")[1].split(".")[0].split(":")  // turn dateobj to string array [0]hours [1]minutes
        const dateText = dateNoTimezone(startTime).split('T')[0]

        const start = sHours + ':' + sMinutes
        const end = eHours + ':' + eMinutes

        const dialog = document.createElement('dialog')
        dialog.classList.add('createPopup')
        dialog.innerHTML = `
            <h3>${dateText}</h3>
            <div class='crPopDiv'>
                <p>otsikko</p>
                <input type='text' class='otsikko'/>
            </div>
            <div class='crPopDiv'>
                <p>varaaja</p>
                <input type='text' class='varaaja'/>
            </div>
            <div class='crPopDiv'>
                <p>kello</p>
                <div class='crClock'>
                    <input type='time' value='${start}' class='kloStart'/>
                    <p>-</p>
                    <input type='time' value='${end}' class='kloEnd'/>
                </div>
            </div>
            <div class='crPopDiv'>
                <p>tila</p>
                <select class='huoneSelect'></select>
            </div>
            <div class='crPopDiv'>
                <p>sisältö</p>
                <textarea rows='5' cols='28' class='sisalto'></textarea>
            </div>
            <div class='btnContainer'>
                <button class='yesButton'>varaa</button>
                <button class='cancelButton'>peruuta</button>
            </div>

        `
        // <input type='text' value='Neuvotteluhuone' class='tila'/>

        const cancelButton = dialog.querySelector('.cancelButton')
        cancelButton.addEventListener('click', () => {
            dialog.remove()
            resolve(null)
        })

        const huoneSelector = dialog.querySelector('.huoneSelect')
        for (const [room, color] of Object.entries(php_args.huoneet)){
            const selectElement = document.createElement('option')
            selectElement.appendChild(
                document.createTextNode(room)
            )
            huoneSelector.appendChild(selectElement)
        }


        const yesButton = dialog.querySelector('.yesButton')
        yesButton.addEventListener('click', () => {
            const otsikko = dialog.querySelector('.otsikko')
            const varaaja = dialog.querySelector('.varaaja')
            //const tila = dialog.querySelector('.tila')
            const sisalto = dialog.querySelector('.sisalto')
            const alku = dialog.querySelector('.kloStart')
            const loppu = dialog.querySelector('.kloEnd')

            if(!otsikko.value) otsikko.style = 'border: 2px solid red;'
            if(!varaaja.value) varaaja.style = 'border: 2px solid red;'
            if(!otsikko.value || !varaaja.value) return

            const alkuDate = new Date(startTime)
            const [hours, minutes] = alku.value.split(':')
            alkuDate.setHours(hours)
            alkuDate.setMinutes(minutes)
            alkuDate.setSeconds(0)
            
            const loppuDate = new Date(endTime)
            const [hoursE, minutesE] = loppu.value.split(':')
            loppuDate.setHours(hoursE)
            loppuDate.setMinutes(minutesE)
            loppuDate.setSeconds(0)

            const sisaltoFixed = sisalto.value ? sisalto.value.replaceAll('\n', ' ') : null
            //const tilaFixed = tila.value ? tila.value : null

            dialog.remove()
            resolve({
                otsikko: otsikko.value,
                varaaja: varaaja.value,
                tila: huoneSelector.value,
                sisalto: sisaltoFixed,
                alkuDate,
                loppuDate
            })
        })

        document.body.appendChild(dialog)
        dialog.showModal()
    })
}


async function clickPopup(event) {
    return new Promise((resolve) => {
      // clickDialog the main element.
      const clickDialog = document.createElement("dialog")
      clickDialog.setAttribute('id', 'clickPopup')
      document.body.appendChild(clickDialog)
  
      // event info
      const titleText = document.createElement('h2')
      titleText.textContent = event.title
  
      const dateText = document.createElement('h4')
      dateText.textContent = dateToJustDate(dateNoTimezone(event.start))
  
      const timeText = document.createElement('h4')
      timeText.textContent = dateToHourMin(dateNoTimezone(event.start)) + ' - ' + dateToHourMin(dateNoTimezone(event.end))
  
      const endText = document.createElement('p')
      endText.textContent = event._def.extendedProps.varaaja ? event._def.extendedProps.varaaja : 'ei varaajaa'
  
      // event room?
      function roomText (clickDialog) {
        if(event._def.extendedProps.room) {
            const roomText = document.createElement('h4')
            roomText.textContent = event._def.extendedProps.room
            clickDialog.appendChild(roomText)
        }
      }

      // event content?
      function contentText (clickDialog) {
        if(event._def.extendedProps.content){
            const content = document.createElement('div')
            content.setAttribute('id', 'popContent')

            const contentText = document.createElement('p')
            contentText.textContent = event._def.extendedProps.content
            //content.textContent = event._def.extendedProps.content
            content.appendChild(contentText)
            clickDialog.appendChild(content)
        }
      }

      // delete dialog button ###########################################
      var deleteButton = document.createElement('button')
      deleteButton.textContent = 'poista'
      deleteButton.setAttribute('id', 'deleteButton')
      deleteButton.addEventListener('click', () => dialogDelete())
  
      function dialogDelete() {
        closeButton.removeEventListener('click', () => dialogClose())
        deleteButton.removeEventListener('click', () => dialogDelete())
        clickDialog.remove()
        resolve({id: event.id, delete: true, update: false})
      }
      // ################################################################
  
  
      // close dialog button ############################################
      var closeButton = document.createElement('button')
      closeButton.textContent = 'takaisin'
      closeButton.setAttribute('id', 'closeButton')
      closeButton.addEventListener('click', () => dialogClose())
  
      function dialogClose() {
        closeButton.removeEventListener('click', () => dialogClose())
        deleteButton.removeEventListener('click', () => dialogDelete())
        clickDialog.remove()
        resolve({id: null, delete: false, update: false})
      }
      // ################################################################
  
  
      // Finalize creating element
      clickDialog.appendChild(titleText)
      roomText(clickDialog)
      clickDialog.appendChild(dateText)
      clickDialog.appendChild(timeText)
      clickDialog.appendChild(endText)
      contentText(clickDialog)
      clickDialog.appendChild(deleteButton)
      clickDialog.appendChild(closeButton)
      clickDialog.showModal()
    })
}

async function moveDialog(textContent) {
    return new Promise((resolve) => {
        // clickDialog the main element.
        const dialog = document.createElement("dialog")
        dialog.classList.add('moveDialog')
        document.body.appendChild(dialog)

        const paragraph = document.createElement('p')
        paragraph.textContent = textContent

        const yesButton = document.createElement('button')
        yesButton.classList.add('yesButton')
        yesButton.innerText = 'kyllä'
        yesButton.addEventListener('click', () => {
            dialog.remove()
            resolve(true)
        })

        const noButton = document.createElement('button')
        noButton.classList.add('noButton')
        noButton.innerText = 'ei'
        noButton.addEventListener('click', () => {
            dialog.remove()
            resolve(false)
        })

        dialog.append(
            paragraph,
            yesButton,
            noButton
        )
        dialog.showModal()
    })
}


async function SeriesPopup(startDateObj, endDateObj) {
    return new Promise((resolve) => {

        function addDays(date, days) {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        }
      
          function parseClock(clock) {
            const [hours, minutes] = clock.split(':')
            return parseInt(hours)*60 + parseInt(minutes)
        }

        // start datetime
        const [startDate, startTime] = dateNoTimezone(startDateObj).split("T")
        const [sYear, sMonth, sDay] = startDate.split('-')

        // end datetime
        const [endDate, endTime] = dateNoTimezone(endDateObj).split("T")
        const [eYear, eMonth, eDay] = endDate.split('-')

        const dialog = document.createElement('dialog')
        dialog.classList.add('seriesPopup')
        dialog.innerHTML = `
            <h1>Sarja varaus</h1>
            
            <div class='dualContainer'>

                <div class='dualContainerPartial'>
                    <div class='crPopDiv'>
                    <p>otsikko</p>
                    <input type='text' class='otsikko'/>
                    </div>
                    <div class='crPopDiv'>
                        <p>varaaja</p>
                        <input type='text' class='varaaja'/>
                    </div>
                    <div class='crPopDiv'>
                        <p>tila</p>
                        <select class='huoneSelect'></select>
                    </div>
                    <div class='crPopDiv'>
                        <p>sisältö</p>
                        <textarea rows='5' cols='28' class='sisalto'></textarea>
                    </div>
                </div>
                
                <div class='dualContainerPartial'>
                    <div>
                        <p>Kello</p>
                        <div class='popTimeSpan'>
                        <input type='time' id='popTimeStartTime' value='08:00'/>
                        <p>:</p>
                        <input type='time' id='popTimeEndTime' value='10:00'/>
                        </div>
                    </div>
                </div>

            </div>


            <button class='closeButton varausBaseButton'>peruuta</button>
        `

        const closeButton = dialog.querySelector('.closeButton')
        closeButton.addEventListener('click', () => {
            dialog.remove()
            resolve(null)
        })

        document.body.appendChild(dialog)
        dialog.showModal()
    })
}