document.addEventListener('DOMContentLoaded', async () => {
    const calendarElement = document.getElementById(php_args.element_name)
    if(!calendarElement) return
    
    const link = document.createElement('a')
    link.href = php_args.link_to_list
    link.textContent = 'Varaus lista'
    link.style = 'font-size: 1.25em; text-decoration: underline !important;'
    calendarElement.parentElement.appendChild(link)

    calendarElement.setAttribute('name', 'huone_kalenteri_css')
    console.log('Tilavaraukset loaded.')


    let reservations

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
        slotEventOverlap: false,

        //weekends: false,

        select: async function(arg) {
            // 1 day has to be subtracted when in monthview and making reservations, else 2 day long event is created.
            const endDate = new Date(arg.end)
            if (calendar.view.type === 'dayGridMonth') { endDate.setDate(arg.end.getDate() - 1) }

            const result = await createPopup(arg.start, endDate).catch(e => {
                console.log('error:', e)
                calendar.unselect()
            })
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

            if (clickPopupReturn.delete && clickPopupReturn.series == false){
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

            if (clickPopupReturn.delete && clickPopupReturn.series) {
                const varaaja = arg.event._def.extendedProps.varaaja
                
                jQuery.ajax({
                    type: "post",
                    dataType: "json",
                    url: php_args.ajax_url,
                    data: {
                        action:'huone_delete_db_varaaja',
                        varaaja
                    },
                    success: function(){ 
                        calendar.getEvents().forEach(eventti => {
                            if(eventti._def.extendedProps.varaaja === varaaja) {
                                eventti.remove()
                            }
                        })
                        console.log('deleted series:', varaaja); 
                    },
                    error: function(error){
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
            const moveResult = await moveDialog('päivitä varaus?', arg.event._instance.range).catch(e => {
                console.log('error:', e)
                calendar.unselect()
            })
            if(moveResult){
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

                //const hText = document.createElement('h3')
                const hText = document.createElement('div')
                hText.textContent = event.event._def.title
                hText.classList.add('hkBaseText')
                title.appendChild(hText)

                if (event.event._def.extendedProps.room) {
                    //const pText = document.createElement('p')
                    const pText = document.createElement('div')
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
                    varaaja.textContent = event.event._def.extendedProps.varaaja.split('::')[0]
                    varaaja.classList.add('huone-event-varaaja')
                    //varaaja.classList.add('fc-event-title')
                    //varaaja.classList.add('fc-sticky')
                    eventElement.append(varaaja)
                }
            }
        }
    })

    calendar.render()

    
    const seriesButton = document.createElement('button')
    seriesButton.innerHTML = 'Sarja varaus'
    seriesButton.classList.add('varausBaseButton', 'baseFCButton') //'baseFCButton'
    seriesButton.addEventListener('click', async () => {
        const threeHours = 1000 * 60 * 60 * 3
        const oneDay = 1000 * 60 * 60 * 24
        SeriesPopup(new Date(), new Date(Date.now() + threeHours + oneDay*7)).then(value => {
            if(value === null) return;

            jQuery.ajax({
                type: "post",
                dataType: "json",
                url: php_args.ajax_url,
                data: {
                    action:'huone_post_db_multi',
                    title: value.title,
                    varaaja: value.varaaja,
                    room: value.room,
                    content: value.content,
                    dates: value.dates
                },
                success: function(resp){ 
                    console.log('events added:', resp.data.result);
                    //refetch reservations from database, filter by varaaja(reserver) and append new values to calendar events..
                    getAllFilterByVaraaja(value.varaaja).then(result => {
                        calendar.addEventSource(result)
                    })
                },
                error: function(error){
                    console.log('update error:', error)
                }
            })
        })
    })
    calendarElement.appendChild(seriesButton)

    async function getAllFilterByVaraaja(varaaja) {
        return new Promise((resolve, reject) => {
            jQuery.ajax({
                type: "POST",
                dataType: "json",
                url: php_args.ajax_url,
                data: { action:'huone_get_all' },
                success: function(response){
                    const resultJSON = response.data
                        .filter(obj => obj.varaaja === varaaja)
                        .map(obj => {
                            const color = php_args.huoneet[obj.room] ? php_args.huoneet[obj.room] : '#5baa00'
                            return {...obj, color:color}
                        })

                    resolve(resultJSON)
                },
                error: function(jqXHR, error, errorThrown){
                    if(jqXHR.status&&jqXHR.status==200){
                    reject('err', jqXHR);
                    } else {
                    reject(jqXHR.responseText)
                    }
                }
            })
        })
    }
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

function isValueEmpty(element, condition){
    if(condition) {
        element.style = 'outline: 1px solid red;'
        return true
    } else {
        element.style = 'outline: none;'
        return false
    }
}

function elevenHourLimit(startDateObj, endDateObj){
    const diffTime = endDateObj - startDateObj
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const startString = dateNoTimezone(startDateObj).split('T')[1]
    const endString = dateNoTimezone(endDateObj).split('T')[1]
    const clockMinutes = parseClock(endString) - parseClock(startString) + (diffDays * 24 * 60)
    if(clockMinutes <= 0 || clockMinutes > 12*60) {
        return true
    } else {
        return false
    }
}

function parseClock(clock) {
    const [hours, minutes] = clock.split(':')
    return parseInt(hours)*60 + parseInt(minutes)
}

async function createPopup(startTime, endTime) {
    return new Promise((resolve, reject) => {
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

        /*
        const diffTime = new Date(endTime) - new Date(startTime)
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        const clockMinutes = parseClock(end) - parseClock(start) + (diffDays * 24 * 60)
        if(clockMinutes <= 0 || clockMinutes > 12*60) {
            //console.log('Reservation time is over 11 hours limit', clockMinutes)
            dialog.remove()
            reject(`Reservation is longer than 11h, its at: ${clockMinutes / 60}h`)
            return
        }
        */
       if(elevenHourLimit(new Date(startTime), new Date(endTime))){
            dialog.remove()
            reject(`Reservation is longer than 11h`)
            return
       }

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

            /*
            if(!otsikko.value) otsikko.style = 'border: 2px solid red;'
            if(!varaaja.value) varaaja.style = 'border: 2px solid red;'
            if(!otsikko.value || !varaaja.value) return
            */

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

            if(
                isValueEmpty(otsikko, !otsikko.value) |
                isValueEmpty(varaaja, !varaaja.value)
                ){
                return
            }

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
      //deleteButton.setAttribute('id', 'deleteButton')
      deleteButton.classList.add('varausBaseButton', 'baseRed')
      deleteButton.addEventListener('click', () => dialogDelete())
  
      function dialogDelete() {
        closeButton.removeEventListener('click', () => dialogClose())
        deleteButton.removeEventListener('click', () => dialogDelete())
        clickDialog.remove()
        resolve({id: event.id, delete: true, update: false, series: false})
      }
      // ################################################################
  
  
      // close dialog button ############################################
      var closeButton = document.createElement('button')
      closeButton.textContent = 'takaisin'
      //closeButton.setAttribute('id', 'closeButton')
      closeButton.classList.add('varausBaseButton')
      closeButton.addEventListener('click', () => dialogClose())
  
      function dialogClose() {
        closeButton.removeEventListener('click', () => dialogClose())
        deleteButton.removeEventListener('click', () => dialogDelete())
        clickDialog.remove()
        resolve({id: null, delete: false, update: false, series: false})
      }
      // ################################################################

      // delete series button ###########################################
        const varaajaSerial = event._def.extendedProps.varaaja.split('::')
        let deleteSeriesButton = false
        if(varaajaSerial.length > 1){
            deleteSeriesButton = document.createElement('button')
            deleteSeriesButton.textContent = 'poista koko sarja'
            deleteSeriesButton.classList.add('varausBaseButton', 'baseRed')
            deleteSeriesButton.addEventListener('click', () => {
                clickDialog.remove()
                resolve({id: event.id, delete: true, update: false, series: true})
            })
        }
        // ################################################################
  
  
      // Finalize creating element
      clickDialog.appendChild(titleText)
      roomText(clickDialog)
      clickDialog.appendChild(dateText)
      clickDialog.appendChild(timeText)
      clickDialog.appendChild(endText)
      contentText(clickDialog)
      if (deleteSeriesButton) {
        clickDialog.appendChild(deleteSeriesButton)
      }
      clickDialog.appendChild(deleteButton)
      clickDialog.appendChild(closeButton)
      clickDialog.showModal()
    })
}

async function moveDialog(textContent, ...arguments) {
    return new Promise((resolve, reject) => {
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

        if(arguments.length > 0) {
            for(const argument of arguments) {
                if('start' in argument && 'end' in argument){
                    if(elevenHourLimit(argument.start, argument.end)){
                        dialog.remove()
                        reject(`Reservation is longer than 11h`)
                        return
                   }
                }
            }
        }

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
                
                <div class='dualContainerPartialB'>

                    <div class='crClock'>
                        <p>Aikaväli</p>
                        <div class='popTimeSpan'>
                            <input type='date' id='popDateStartTime' value='${sYear}-${sMonth}-${sDay}'/>
                            <p>:</p>
                            <input type='date' id='popDateEndTime' value='${eYear}-${eMonth}-${eDay}'/>
                        </div>
                    </div>

                    <div class='crClock'>
                        <p>Kello</p>
                        <div class='popTimeSpan'>
                            <input type='time' id='popTimeStartTime' value='08:00'/>
                            <p>:</p>
                            <input type='time' id='popTimeEndTime' value='10:00'/>
                        </div>
                    </div>

                    <div class='popDaySelect'>
                        <div>
                            <input type='checkbox' id='cbMa' class='cbDay'/>
                            <label for='cbMa'>ma</label>
                        </div>
                        <div>
                            <input type='checkbox' id='cbTi' class='cbDay'/>
                            <label for='cbTi'>ti</label>
                        </div>
                        <div>
                            <input type='checkbox' id='cbKe' class='cbDay'/>
                            <label for='cbKe'>ke</label>
                        </div>
                        <div>
                            <input type='checkbox' id='cbTo' class='cbDay'/>
                            <label for='cbTo'>to</label>
                        </div>
                        <div>
                            <input type='checkbox' id='cbPe' class='cbDay'/>
                            <label for='cbPe'>pe</label>
                        </div>
                    </div>


                </div>

            </div>

            <div class='crButtonContainer'>
                <button class='addButton varausBaseButton baseGreen'>varaa</button>
                <button class='closeButton varausBaseButton'>peruuta</button>
            </div>
        `

        const closeButton = dialog.querySelector('.closeButton')
        closeButton.addEventListener('click', () => {
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

        const addButton = dialog.querySelector('.addButton')
        addButton.addEventListener('click', () => {
            //check title and varaaja not null
            const title = dialog.querySelector('.otsikko')
            const varaajaElement = dialog.querySelector('.varaaja')

            const startClock = dialog.querySelector('#popTimeStartTime').value
            const startDateText = `${dialog.querySelector('#popDateStartTime').value}T${startClock}:00`
            const startDateInput = new Date(startDateText)

            const endClock = dialog.querySelector('#popTimeEndTime').value
            const endDateText = `${dialog.querySelector('#popDateEndTime').value}T${endClock}:00`
            const endDateInput = new Date(endDateText)

            // get day checkbox inputs and add saturday and sunday => 7days
            const checkboxElements = dialog.getElementsByClassName('cbDay')
            let daysChecked = []
            for (const checkbox of checkboxElements) {
                daysChecked.push(checkbox.checked)
            }
            daysChecked.push(false) // saturday
            daysChecked.push(false) // sunday

            const diffTime = startDateInput - endDateInput
            const diffDays = Math.floor(-diffTime / (1000 * 60 * 60 * 24)) // time difference in days.

            const endDateElement = dialog.querySelector('#popDateEndTime')
            const endClockElement = dialog.querySelector('#popTimeEndTime')
            const checkboxElementsContainer = dialog.querySelector('.popDaySelect')
            const clockMinutes = parseClock(endClock) - parseClock(startClock)
            if(
                isValueEmpty(title, title.value === '') | 
                isValueEmpty(varaajaElement, varaajaElement.value === '') |
                isValueEmpty(endDateElement, diffTime >= 0 || diffDays === 0 || diffDays >= 180) |
                isValueEmpty(endClockElement, clockMinutes <= 0 || clockMinutes > 12*60) |
                isValueEmpty(checkboxElementsContainer, daysChecked.reduce((prev, curr) => prev + curr) === 0)
                ) {
                return
            }
            // loop through days froms start to end
            const arrayOfDates = [] //[{start: date, endDate}, {}, ...]
            for (let i = 0; i <= diffDays; i++){
                const newDate = addDays(startDateInput, i)
                if(daysChecked[ newDate.getDay() - 1 ]){
                const newDateEnd = new Date(newDate)//addDays(endDateInput, i)
                const [eHours, eMins] = endClock.split(':')
                newDateEnd.setHours(parseInt(eHours))
                newDateEnd.setMinutes(parseInt(eMins))
                arrayOfDates.push({
                    start: dateNoTimezone(newDate),//newDate,
                    end: dateNoTimezone(newDateEnd)//newDateEnd
                })
                }
            }

            if(arrayOfDates.length === 0){
                dialog.remove()
                resolve(null)
            }

            //assign millisconds since 1970 as reservation series id
            const varaaja = `${varaajaElement.value} ::sarja ::${new Date().valueOf()}`
            const content = dialog.querySelector('.sisalto')
            const contentFixed = content.value ? content.value.replaceAll('\n', ' ') : null

            dialog.remove()
            resolve({
                varaaja,
                title: title.value,
                room: huoneSelector.value,
                content: contentFixed,
                dates: arrayOfDates
            })
        })


        document.body.appendChild(dialog)
        dialog.showModal()
    })
}