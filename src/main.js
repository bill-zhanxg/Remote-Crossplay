'use strict';

const hostURL = localStorage.getItem('host');
const joinURL = localStorage.getItem('join');
if (hostURL) document.getElementById('host-input').value = hostURL;
if (joinURL) document.getElementById('join-input').value = joinURL;

function action(type, url) {
	if (!url) return window.mainActions.messageBox('The input field cannot be left blank!');
	window.mainActions.userAction(type, url);
	localStorage.setItem(type, url);
}

// Get All open-modal buttons on the page
var modals = document.querySelectorAll('.modal-open');

modals.forEach((element) => {
	//Add click listeners to open-modal buttons
	element.addEventListener('click', () => {
		//Get the unique popup modal for that button
		var popupModal = document.getElementById(element.dataset.popupTrigger);

		//Select the close button of current popup modal
		var popupModalCloseButton = document
			.getElementById(element.dataset.popupTrigger)
			.getElementsByClassName('modal-close-button')[0];

		// Show/hide modal on click by toggling the class
		popupModal.classList.toggle('show-modal');

		//Add event listener to close button on popup modal.
		popupModalCloseButton.addEventListener('click', () => {
			popupModal.classList.remove('show-modal');
		});
	});
});
