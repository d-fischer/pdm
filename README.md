# pdm - a Project Directory Manager

![Demo](/demo.gif?raw=true "Demo")

pdm is a little tool that helps you manage all your different projects.

The initial version only supports switching between projects within project folders.
Later, there will be additional features like keeping your tooling configuration in sync.

## Installation

```shell
yarn global add pdm
# or
npm install -g pdm

pdm install fish # currently, fish and bash are the only supported shells
```

You also need to set up your project parent folder.

```shell
pdm root add ~/projects
```

## Usage

After that, you can switch between projects using the `gp` command. It supports tab completion and partial matches.

For all following examples, suppose there are the following project folders inside the parent:

```
abc foo bar baz
```

```shell
gp abc
# you are now inside the `abc` project folder
```

```shell
gp ghi
# Could not find a match for the project name ghi.
```

```shell
gp fo
# you are now inside the `foo` project folder since it's the only match
```

```shell
gp b
# ? The input is ambiguous, please choose the correct project you want to go to › - Use arrow-keys. Return to submit.
# ❯   projects:abc
#     projects:bar
#     projects:baz

# after selection, you are in the chosen folder
```

In Bash, the default namespace separator `:` is treated as a separator for a new token. For bash users
it is recommended to set the namespace separator to another character or completion will not behave as expected.

```shell
pdm config namespace-separator /
# in Git Bash on Windows / will be transformed into the install directory so instead:
pdm config namespace-separator //
```

## To do

- Shell support
  - zsh
