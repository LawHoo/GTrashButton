/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at https://mozilla.org/MPL/2.0/
 *
 * © 2022 Roy Orbison
 * */

const commandGtrash = 'gtrash';
const folderTypeTrash = 'trash';

messenger.commands.onCommand.addListener(async function(command) {
	if (command === commandGtrash) {
		try {
			let messageList = await messenger.mailTabs.getSelectedMessages(),
				moves = {};
			do {
				if (messageList?.messages?.length) {
					for (let messageHeader of messageList.messages) {
						// queue up moves, ignoring messages already in trash
						if (messageHeader.folder && messageHeader.folder.type !== folderTypeTrash) {
							if (!moves[messageHeader.folder.accountId]) {
								moves[messageHeader.folder.accountId] = {
									ids: []
								};
							}
							moves[messageHeader.folder.accountId].ids.push(messageHeader.id);
						}
					}
					for (let accountId in moves) {
						if (moves[accountId].trash === undefined) {
							moves[accountId].trash = null;
							let account = await messenger.accounts.get(accountId);
							if (!account?.folders?.length) {
								continue;
							}
							findTrash: for (let folder of account.folders) {
								// in case user set special as IMAP dir
								if (folder.type === folderTypeTrash) {
									moves[accountId].trash = folder;
									break findTrash;
								}
								// otherwise look in special, folders named like "[Gmail]" and "[Googlemail]"
								if (/^\[[^\/]+\]$/.test(folder.name)) {
									for (let subFolder of folder.subFolders) {
										if (subFolder.type === folderTypeTrash) {
											moves[accountId].trash = subFolder;
											break findTrash;
										}
									}
								}
							}
						}
						if (moves[accountId].trash || moves[accountId].ids.length) {
							await messenger.messages.move(moves[accountId].ids, moves[accountId].trash);
							moves[accountId].ids = [];
						}
					}
				}
			} while (
				messageList.id
				&& (messageList = await messenger.messages.continueList(messageList.id))
			);
		}
		catch (error) {
		}
	}
});