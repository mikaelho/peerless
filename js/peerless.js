
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
        this.name = window.localStorage.getItem("peerless_name");
        this.peerID = window.localStorage.getItem("peerless_peerID");
    },

    start: (mode, name) => {
        this.mode = mode;
        this.name = name;
        window.localStorage.setItem("peerless_name", name);

        if (!this.peerID) {
            this.peerID = PeerlessUtil.makeID();
        }
        this.peer = new Peer(this.peerID);  // , {debug: 3});
        this.peer.on("error", console.log);
        this.peer.on("connection", this.onConnection);

        switch (mode) {
            case PeerlessMode.PEER:
                // Regular peers start by connecting to the prime
                const groupID = new URLSearchParams(window.location.search).get("groupID");
                const connection = peer.connect(groupID, {metadata: {name: this.name}});
                connection.on("error", console.log);
                connection.on("open", () => { this.setUpConnection(connection); });
                break;
            case PeerlessMode.STARTER:
            case PeerlessMode.HUB:
                // Prime just publishes the URL to be shared with the peers
                const groupURL = PeerlessUtil.getGroupURL(this.peerID);
                navigator.clipboard.writeText(groupURL);
                return groupURL;
        }
    },

    onConnection: (connection) => {
        if (this.mode === PeerlessMode.STARTER) {
            // Get everyone connected to everyone
            this.broadcast("connectToPeer", {peerID: connection.peer, name: connection.metadata.name});
        }
        this.setUpConnection(connection);
        // Make sure the caller knows the user's name corresponding to the connection, for display purposes
        this.send(connection, "setPeerName", {peerID: this.peerID, name: this.name});
    },

    connectToPeer: (connection, peerData) => {
        const peerConnection = peer.connect(peerData.peerID, {metadata: {name: this.name}});
        peerConnection.on("open", () => {
            peerConnection.metadata.name = peerData.name;
            this.setUpConnection(peerConnection);
        });
    },

    setPeerName: (connection, peerData) => {
        this.connections[peerData.peerID].metadata.name = peerData.name;
        this.connectionsChanged();
    },

    setUpConnection: (connection) => {
        this.connections[connection.peer] = connection;
        connection.on("data", this.messageReceived.bind(this, connection));
        connection.on("close", this.connectionClosed.bind(this, connection));
        this.connectionsChanged();
    },

    send: (connection, action, data) => {
        connection.send({action: action, data: data});
    },

    broadcast: (action, data) => {
        Object.values(this.connections).forEach(connection => {this.send(connection, action, data)});
    },

    messageReceived: (connection, message) => {
        this[message.action](connection, message.data);
    },

    connectionClosed: (connection) => {
        delete this.connections[connection.peer];
        this.connectionsChanged();
    },

    connectionsChanged: () => {
        const peerNameList = Object.values(connections).map((connection) => connection.metadata.name);
        this.onConnectionsChanged(peerNameList);
    },

    onConnectionsChanged: (peerNameList) => {  // To be overwritten by the outside logic
        console.log("Connections: " + peerNameList.join(", "));
    },
}


const PeerlessUtil = {
    makeID: () => {
        const randomNumber = Math.round(Math.random() * Math.pow(10, 20)).toString() + "-";
        return "peerless-" + randomNumber;
    },

    getGroupURL: (groupID) => {
        const location = window.location;
        return `${location.protocol}//${location.host}${location.pathname}?groupID=${groupID}`;
    },
}