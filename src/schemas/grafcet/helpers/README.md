The helpers are not expected to raise errors \
When a helper raises an error, it means that the user actions have not been correctly managed \
\
Example : \

- When we use the action helper to get the step connected to an action
- Each connection should be validated in the UI, to ensure that we only have one step connected to the action
- We should also make sure that nothing else than a step is connected that handle
- If the rules are not respected, the helper will raise an error
