
const PeerlessMode = {
    PEER: "PEER",  // Just another node with no special role
    STARTER: "STARTER",  // "Prime" node that gets the first connections but does not relay messages
    HUB: "HUB",  // "Prime" node that all messages go through
}

const Peerless = {
    name: undefined,  // Display name
    peerID: undefined,  // My peer ID, construed from the name, or from the group ID for the hub
    peer: undefined,  // My peer object
    mode: PeerlessMode.PEER,
    connections: {},  // Connections to and names of all the other peers, keyed by peer ID

    setValuesFromLocalStorage: () => {
        Peerless.name = window.localStorage.getItem("peerless_name") || "";
        Peerless.peerID = window.localStorage.getItem("peerless_peerID");
    },

    start: (mode, name) => {
        Peerless.mode = mode;
        Peerless.name = name;
        window.localStorage.setItem("peerless_name", name);

        if (!Peerless.peerID) {
            Peerless.peerID = PeerlessUtil.makeID();
        }
        console.log("I am " + Peerless.peerID);
        Peerless.peer = new Peer(Peerless.peerID);  // , {debug: 3});
        Peerless.peer.on("error", console.log);
        Peerless.peer.on("connection", Peerless.onConnection);

        switch (mode) {
            case PeerlessMode.PEER:
                // Regular peers start by connecting to the prime
                const groupID = new URLSearchParams(window.location.search).get("groupID");
                console.log(Peerless.mode + " " + Peerless.name + " connecting to " + groupID);
                const connection = Peerless.peer.connect(groupID, {metadata: {name: Peerless.name}});
                connection.on("error", console.log);
                connection.on("open", () => { Peerless.setUpConnection(connection); });
                break;
            case PeerlessMode.STARTER:
            case PeerlessMode.HUB:
                // Prime just publishes the URL to be shared with the peers
                const groupURL = PeerlessUtil.getGroupURL(Peerless.peerID);
                navigator.clipboard.writeText(groupURL);
                return groupURL;
        }
    },

    onConnection: (connection) => {
        console.log(Peerless.mode + " " + Peerless.name + " received connection from " + connection.metadata.name);
        if (Peerless.mode === PeerlessMode.STARTER) {
            // Get everyone connected to everyone
            Peerless.broadcast("connectToPeer", {peerID: connection.peer, name: connection.metadata.name});
        }
        Peerless.setUpConnection(connection);
        // Make sure the caller knows the user's name corresponding to the connection, for display purposes
        Peerless.send(connection, "setPeerName", {peerID: Peerless.peerID, name: Peerless.name});
    },

    connectToPeer: (connection, peerData) => {
        const peerConnection = Peerless.peer.connect(peerData.peerID, {metadata: {name: Peerless.name}});
        peerConnection.on("open", () => {
            peerConnection.metadata.name = peerData.name;
            Peerless.setUpConnection(peerConnection);
        });
    },

    setPeerName: (connection, peerData) => {
        Peerless.connections[peerData.peerID].metadata.name = peerData.name;
        Peerless.connectionsChanged();
    },

    setUpConnection: (connection) => {
        Peerless.connections[connection.peer] = connection;
        connection.on("data", Peerless.messageReceived.bind(Peerless, connection));
        connection.on("close", Peerless.connectionClosed.bind(Peerless, connection));
        Peerless.connectionsChanged();
    },

    send: (connection, action, data) => {
        connection.send({action: action, data: data});
    },

    broadcast: (action, data) => {
        Object.values(Peerless.connections).forEach(connection => {Peerless.send(connection, action, data)});
    },

    messageReceived: (connection, message) => {
        Peerless[message.action](connection, message.data);
    },

    connectionClosed: (connection) => {
        delete Peerless.connections[connection.peer];
        Peerless.connectionsChanged();
    },

    connectionsChanged: () => {
        const peerNameList = Object.values(connections).map((connection) => connection.metadata.name);
        Peerless.onConnectionsChanged(peerNameList);
    },

    onConnectionsChanged: (peerNameList) => {  // To be overwritten by the outside logic
        console.log("Connections: " + peerNameList.join(", "));
    },
}


const PeerlessUtil = {
    makeID: () => {
        const randomNumber = Math.round(Math.random() * Math.pow(10, 20)).toString();
        return "peerless-" + randomNumber;
    },

    getGroupURL: (groupID) => {
        const location = window.location;
        return `${location.protocol}//${location.host}${location.pathname}?groupID=${groupID}`;
    },
}