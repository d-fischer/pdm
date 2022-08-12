# pdm - a Project Directory Manager

![Demo](/demo.gif?raw=true "Demo")

pdm is a little tool that helps you manage all your different projects.

The initial version only supports switching between the projects inside one folder.
Later, there will be additional features like support for multiple project folders
and keeping your tooling configuration in sync.

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
# ❯   abc
#     bar
#     baz

# after selection, you are in the chosen folder
```

## To do

- Shell support
  - zsh
- Multiple parent folder support (namespacing?)
- Config updater
