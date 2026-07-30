import { App } from "cdktn";

import { ListenerStack } from "./stacks/listener";
import { NetworkStack } from "./stacks/network";

const app = new App();

// STACKS
const networkStack = new NetworkStack(app);
const listenerStack = new ListenerStack(app);

// DEPENDENCIES
// The listener reads the network's outputs through remote state, which Terraform
// cannot see as a dependency on its own — the ordering has to be declared.
listenerStack.addDependency(networkStack);

app.synth();
