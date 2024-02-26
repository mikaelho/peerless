function maybe(event, actualFunction) {
    if (event.key === "Enter") {  //checks whether the pressed key is "Enter"
        actualFunction();
    }
}


function showSection(sectionIDsToShow) {
    sections.forEach((sectionIDToHide) => {
        document.getElementById(sectionIDToHide).style.display = "none";
    });
    sectionIDsToShow.forEach((sectionIDToShow) => {
        document.getElementById(sectionIDToShow).style.display = "inherit";
    });
}