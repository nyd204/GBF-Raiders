var socket = io.connect( '/' );
var raids = [];
var clipboard = new Clipboard( '.copy-div', {
	text: function ( trigger ) {
		return trigger.dataset.clipboard;
	}
} );
var tableBody = document.getElementById( "table-body" );
var header = document.getElementById( "header" );
var selectedRaids = document.getElementById( "selected-raids" );
var enableDeskNotifButton = document.getElementById( "enable-notif" );
var enableSoundNotifButton = document.getElementById( "enable-sound" );
var clearListButton = document.getElementById( "clear-list" );
var viramateIframe = document.getElementById( "viramate-api" );
var soundNotif = new Audio( '/assets/UI_Animate_Clean_Beeps_Appear_stereo.wav' );
var playSoundNotif = false;
var sendDesktopNotif = false;
var raidConfigs = [];
var selectedRaidsArray = [];
var xmlHttp = new XMLHttpRequest();
xmlHttp.onreadystatechange = function () {
	if ( xmlHttp.readyState == 4 && xmlHttp.status == 200 && xmlHttp.responseText != undefined ) {
		raidConfigs = JSON.parse( xmlHttp.responseText );
		$( '.ui.search' )
			.search( {
				source: raidConfigs,
				searchFields: [
					'english',
					'japanese'
				],
				searchFullText: true,
				fields: {
					title: 'english',
				},
				onSelect: function ( result, response ) {
					if ( document.getElementById( result.room ) == null ) {
						if ( selectedRaids.innerHTML == "No Raids Selected. Please Search For A Raid In The Search Bar Above." ) {
							selectedRaids.innerHTML = "";
						}
						var selectedLabel = document.createElement( "div" );
						selectedLabel.classList.add( "ui", "big", "label", "image", "selected-raids-label" );
						selectedLabel.id = result.room;
						selectedLabel.innerHTML = '<img src="' + result.image + '">' + result.english + '<i class="delete icon"></i>';
						selectedLabel.addEventListener( "click", function ( event ) {
							socket.emit( 'unsubscribe', {
								room: result.room
							} );
							selectedRaidsArray.splice( selectedRaidsArray.indexOf( result ), 1 );
							localStorage.setItem( "selectedRaids", JSON.stringify(selectedRaidsArray) );
							selectedLabel.remove();
						}, false );
						selectedRaids.appendChild( selectedLabel );
						socket.emit( 'subscribe', {
							room: result.room
						} );
						selectedRaidsArray.push( result );
						localStorage.setItem( "selectedRaids", JSON.stringify(selectedRaidsArray) );
					}
					setTimeout( function () {
						document.getElementById( "searcher" ).value = "";
					}, 50 );
				},
				showNoResults: true
			} );
	}
};

xmlHttp.open( "GET", '/getraids', true );
xmlHttp.send();

socket.on( 'tweet', function ( data ) {
	if ( document.getElementById( data.id ) === null ) {
		raids.push( data );
		var newLine = document.createElement( "tr" );
		newLine.id = data.id;
		newLine.classList.add( "copy-div" );
		newLine.dataset.clipboard = data.id;
		tableBody.insertBefore( newLine, tableBody.firstChild );
		if ( playSoundNotif ) {
			soundNotif.play();
		}
		if ( sendDesktopNotif ) {
			if ( Notification.permission === "granted" ) {
				for ( var x = 0; x < raidConfigs.length; x++ ) {
					if ( raidConfigs[ x ].room == data.room ) {
						var notification = new Notification( raidConfigs[ x ].english, {
							body: "ID: " + data.id,
							image: raidConfigs[ x ].image
						} );
						notification.onclick = function ( event ) {
							event.preventDefault();
							var raid = document.getElementById( data.id );
							raid.click();
							notification.close();
						}
						break;
					}
				}
			}
		}
	}
} );

setInterval( function () {
	if ( selectedRaids.childNodes.length == 0 ) {
		selectedRaids.innerHTML = "No Raids Selected. Please Search For A Raid In The Search Bar Above.";
	}
	for ( var i = raids.length - 1; i >= 0; i-- ) {
		var raidDIV = document.getElementById( raids[ i ].id );
		if ( moment().diff( raids[ i ].time, "seconds" ) > 120 ) {
			tableBody.removeChild( raidDIV );
			raids.splice( i, 1 );
		} else {
			for ( var x = 0; x < raidConfigs.length; x++ ) {
				if ( raidConfigs[ x ].room == raids[ i ].room ) {
					raidDIV.innerHTML = '<td><div class="ui items"><div class="item"><div class="image"><img src="' + raidConfigs[ x ].image + '"></div><div class="content"><div class="header">' + raidConfigs[ x ].english + '</div><div class="meta"><span>' + raidConfigs[ x ].japanese + '</span></div></div></div></td>';
				}
			}
			raidDIV.innerHTML += '<td id="' + raids[ i ].id + '-label" class="center aligned">' + raids[ i ].id + '</td><td class="center aligned">' + moment().diff( raids[ i ].time, "seconds" ) + ' secs ago</td><td><div class="center aligned"><button class="ui primary button right labeled icon toggle join-raid-btn" id="' + raids[ i ].id + '-btn">Join Raid<i class="right sign in icon"></i></button></div></td>';
			document.getElementById( raids[ i ].id + "-btn" ).addEventListener( "click", function ( event ) {
				viramateIframe.contentWindow.postMessage( {
					type: "tryJoinRaid",
					id: ( Math.floor( Math.random() * 900000 ) + 100000 ),
					raidCode: event.target.id.substr( 0, 8 )
				}, "*" );
			} );
		}
	}
}, 1000 );

enableDeskNotifButton.addEventListener( "click", function ( event ) {
	if ( sendDesktopNotif === false ) {
		if ( Notification.permission !== "denied" ) {
			Notification.requestPermission( function ( permission ) {
				if ( permission === "granted" ) {
					var notification = new Notification( "Thank you for enabling notifications!", {
						body: "Click on notifications to copy the ID!",
						icon: "/assets/heregoessticker.png"
					} );
					sendDesktopNotif = true;
					enableDeskNotifButton.innerHTML = 'Disable Desktop Notifications<i class="right announcement icon"></i>';
					enableDeskNotifButton.classList.add( "negative" );
				}
			} );
		}
	} else {
		sendDesktopNotif = false;
		enableDeskNotifButton.innerHTML = 'Enable Desktop Notifications<i class="right announcement icon"></i>';
		enableDeskNotifButton.classList.remove( "negative" );
	}
} );

enableSoundNotifButton.addEventListener( "click", function ( event ) {
	if ( playSoundNotif === false ) {
		playSoundNotif = true;
		enableSoundNotifButton.innerHTML = 'Disable Sound Notifications<i class="right alarm outline icon"></i>';
		enableSoundNotifButton.classList.add( "negative" );
	} else {
		playSoundNotif = false;
		enableSoundNotifButton.innerHTML = 'Enable Sound Notifications<i class="right alarm outline icon"></i>';
		enableSoundNotifButton.classList.remove( "negative" );
	}
} );

clearListButton.addEventListener( "click", function ( event ) {
	raids = [];
	for ( var i = tableBody.childNodes.length - 1; i >= 0; i-- ) {
		tableBody.removeChild( tableBody.childNodes[ i ] );
	}
} );

window.onload = function () {
	window.addEventListener( "message", onMessage, false );

	function onMessage( evt ) {
		if ( evt.data.type !== "result" ) {
			return;
		} else {
			console.log( evt );
		}
	}
	$( '.message .close' )
		.on( 'click', function () {
			$( this )
				.closest( '.message' )
				.transition( 'fade' );
		} );
	if ( localStorage.getItem( "selectedRaids" ) ) {
		selectedRaidsArray = JSON.parse(localStorage.getItem( "selectedRaids" ));
		for ( var i = 0; i < selectedRaidsArray.length; i++ ) {
			if ( document.getElementById( selectedRaidsArray[ i ].room ) == null ) {
				if ( selectedRaids.innerHTML == "No Raids Selected. Please Search For A Raid In The Search Bar Above." ) {
					selectedRaids.innerHTML = "";
				}
				var selectedLabel = document.createElement( "div" );
				selectedLabel.classList.add( "ui", "big", "label", "image", "selected-raids-label" );
				selectedLabel.id = selectedRaidsArray[ i ].room;
				selectedLabel.innerHTML = '<img src="' + selectedRaidsArray[ i ].image + '">' + selectedRaidsArray[ i ].english + '<i class="delete icon"></i>';
				selectedLabel.addEventListener( "click", function ( event ) {
					socket.emit( 'unsubscribe', {
						room: selectedLabel.id
					} );
					selectedRaidsArray.splice( selectedRaidsArray.indexOf( selectedRaidsArray[ i ] ), 1 );
					localStorage.setItem( "selectedRaids", selectedRaidsArray );
					selectedLabel.remove();
				}, false );
				selectedRaids.appendChild( selectedLabel );
				socket.emit( 'subscribe', {
					room: selectedRaidsArray[ i ].room
				} );
			}
		}
	}
};
