package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Edicao;

public interface EdicaoRepository extends JpaRepository<Edicao, Long> {

  Optional<Edicao> findByNomeIgnoreCase(String nome);
}
