import { Card, createListCollection, Group, HStack, IconButton, Input, Text, VStack } from "@chakra-ui/react"
import { LuSettings } from "react-icons/lu"
import { DialogActionTrigger, DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle, DialogTrigger } from "./dialog"
import { Field } from "./field"
import { useState } from "react"
import { RadioCardItem, RadioCardRoot } from "./radio-card"
import { ColorModeButton, useColorMode } from "./color-mode"
import axios from "axios"
import { useStore } from "zustand"
import appStore from "../../store"
import { toaster } from "./toaster"
import { Button } from "./button"

const networks = createListCollection({
    items: [
        { label: "Mainnet", value: "mainnet" },
        { label: "Sepolia", value: "sepolia" },
        { label: "Holesky", value: "holesky" },
    ],
})

// const fileModes = createListCollection({
//     items: [
//         { label: "Public", value: "public" },
//         { label: "Private", value: "private" },
//     ],
// })

const SettingsForm = () => {
    const { setUserProfile, user_profile, backend_url, metamaskAddress, session } = useStore(appStore)
    const { colorMode } = useColorMode()
    /**
     * 
     * user_pub_key : string,
        cli_pub_key: string,
        cli_priv_key: string,
        theme: string,
     */
    const [activeNetwork, setActiveNetwork] = useState<string>(user_profile.witness_network)
    // const [userPubKey, setUserPubKey] = useState<string>(user_profile.user_pub_key)
    const [cliPubKey, setCliPubKey] = useState<string>(user_profile.cli_pub_key)
    const [cliPrivKey, setCliPrivKey] = useState<string>(user_profile.cli_priv_key)
    const [contract, setContract] = useState<string>(user_profile.witness_contract_address ?? "0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611")

    /**
     * "": "0x6c5544021930b7887455e21f00b157b2fa572667",
        "cli_pub_key": null,
        "cli_priv_key": null,
        "witness_network": null,
        "witness_contract_address": null,
        "theme": null
     */
    const updateUserProfile = async () => {
        // const formData = new URLSearchParams();
        // formData.append('cli_priv_key', cliPrivKey);
        // formData.append('cli_pub_key', cliPubKey);
        // formData.append('witness_contract_address', contract);
        // formData.append('witness_network', activeNetwork);
        // formData.append("user_pub_key", metamaskAddress ?? user_profile.user_pub_key)
        // formData.append('theme', colorMode ?? "light");


        const url = `${backend_url}/explorer_update_user_settings`;

        const response = await axios.post(url, {
            'cli_priv_key': cliPrivKey,
            'cli_pub_key': cliPubKey,
            'witness_contract_address': contract,
            'witness_network': activeNetwork,
            'user_pub_key': metamaskAddress ?? user_profile.user_pub_key,
            'theme': colorMode ?? "light",
        }, {
            headers: {
                'metamask_address': metamaskAddress ?? user_profile.user_pub_key,
                'nonce': session?.nonce
                // 'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.status === 200) {
            setUserProfile({
                user_pub_key: user_profile.user_pub_key,
                cli_pub_key: cliPubKey,
                cli_priv_key: cliPrivKey,
                witness_network: activeNetwork,
                theme: colorMode ?? "light",
                witness_contract_address: contract ?? '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',

            })

            toaster.create({
                description: "Settings saved successfully",
                type: "success",
            })

        }
    }

    return (
        <VStack alignItems={'start'} gapY={'6'}>
            <Card.Root w={'100%'} shadow={'sm'} borderRadius={'SM'}>
                <Card.Body p={'4px'} px={'20px'}>
                    <Group justifyContent={'space-between'} w="100%">
                        <Text>Theme</Text>
                        <ColorModeButton />
                    </Group>
                </Card.Body>
            </Card.Root>
            <Field invalid={false} label="Public address" helperText="self-issued identity claim used for generating/verifying aqua chain" errorText="This field is required">
                <Input placeholder="User Public address" disabled={true} value={user_profile.user_pub_key} />
            </Field>
            <Field invalid={false} label="CLI public key " helperText="self-issued identity claim used for generating/verifying aqua chain" errorText="This field is required">
                <Input placeholder="XXXXXXX" value={cliPubKey} onChange={e => setCliPubKey(e.currentTarget.value)} />
            </Field>
            <Field invalid={false} label="CLI private key " helperText="self-issued identity claim used for generating/verifying aqua chain" errorText="This field is required">
                <Input placeholder="XXXXXXXXX" value={cliPrivKey} type={"password"} onChange={e => setCliPrivKey(e.currentTarget.value)} />
            </Field>
            <Field invalid={false} label="Contract Address" errorText="This field is required" >
                <Input placeholder="Contract Address" value={contract} onChange={e => setContract(e.currentTarget.value)} />
            </Field>
            <Field invalid={false} label={"Select Network " + activeNetwork} errorText="This field is required" >
                <RadioCardRoot value={activeNetwork} onValueChange={e => setActiveNetwork(e.value)}>
                    <HStack align="stretch">
                        {networks.items.map((item) => (
                            <RadioCardItem
                                borderRadius={'xl'}
                                label={item.label}
                                key={item.value}
                                value={item.value}
                            />
                        ))}
                    </HStack>
                </RadioCardRoot>
            </Field>
            {/* <Field invalid={false} label="Default File Mode" helperText="Is a file public or private" errorText="This field is required"> */}
            {/* <Field invalid={false} label="Default File Mode" helperText="Any one can view the file or the file should be visible only to you." errorText="This field is required">
                <RadioCardRoot defaultValue="public" value={mode} onValueChange={e => setMode(e.value)}>
                    <HStack align="stretch">
                        {fileModes.items.map((item) => (
                            <RadioCardItem
                                borderRadius={'xl'}
                                label={item.label}
                                key={item.value}
                                value={item.value}
                            />
                        ))}
                    </HStack>
                </RadioCardRoot>
            </Field> */}
            <Group>
                <Button onClick={updateUserProfile}>Save</Button>
            </Group>
        </VStack>
    )
}

const DeleteFiles = () => {
    const [deleting, setDeleting] = useState(false)
    const { setFiles, backend_url, metamaskAddress } = useStore(appStore)

    const deleteFile = async () => {
        try {

            setDeleting(true)
            const url = `${backend_url}/explorer_delete_all_files`;
            const response = await axios.get(url, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'metamask_address': metamaskAddress ?? ''
                }
            });

            if (response.status === 200) {
                setFiles([])
                toaster.create({
                    description: "Files cleared successfully",
                    type: "success"
                })
            }
            setDeleting(false)
        }
        catch (e: any) {
            toaster.create({
                description: `Failed to clear files ${e}`,
                type: "error"
            })
            setDeleting(false)
        }
    }

    return (
        <Button loading={deleting} colorPalette={'red'} borderRadius={'md'} variant={'subtle'} onClick={deleteFile}>Delete all Data</Button>
    )
}

const Settings = () => {

    return (
        <div>
            <DialogRoot size={{ md: 'md', smDown: 'full' }} placement={'top'}>
                <DialogTrigger asChild>
                    <IconButton
                        onClick={() => { }}
                        variant="ghost"
                        aria-label="Toggle color mode"
                        size="sm"
                        css={{
                            _icon: {
                                width: "5",
                                height: "5",
                            },
                        }}
                    >
                        <LuSettings />
                    </IconButton>
                </DialogTrigger>
                <DialogContent borderRadius={{ base: 0, md: 'xl' }}>
                    <DialogHeader>
                        <DialogTitle>Settings</DialogTitle>
                    </DialogHeader>
                    <DialogBody >
                        <SettingsForm />
                    </DialogBody>
                    <DialogFooter>
                        <HStack w={'100%'} justifyContent={'space-between'}>
                            <DeleteFiles />
                            <HStack>
                                <DialogActionTrigger asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DialogActionTrigger>
                            </HStack>
                        </HStack>
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>
        </div>
    )
}

export default Settings